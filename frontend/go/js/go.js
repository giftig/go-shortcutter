(function($, Utils, Forms) {
  const SHORTCUT_TRUNCATE_LENGTH = 16;
  const URL_TRUNCATE_LENGTH = 40;

  // Pubsub system for basic interface events
  const EventBus = {
    subscribers: [],
    subscribe: function(eventName, f) {
      if (!EventBus.subscribers[eventName]) {
        EventBus.subscribers[eventName] = [f];
      } else {
        EventBus.subscribers[eventName].push(f);
      }
    },
    fireEvent: function(eventName, args) {
      const subs = EventBus.subscribers[eventName] || [];

      for (let i = 0; i < subs.length; i++) {
        subs[i](args);
      }
    },
    SHORTCUTS_LOADED: 'shortcutsLoaded',
    KEYWORDS_INDEXED: 'keywordsIndexed'
  };

  const Redirector = {
    redirect: function(target, onError) {
      Client.getUrl(
        target,
        function(url) {
          window.location.href = url;
        },
        onError
      );
    }
  };

  const Client = {
    getUrl: function(shortcut, cb, onError) {
      const clientUrl = '/go/shortcuts/' + shortcut;

      $.ajax({
        url: clientUrl,
        type: 'GET',
        data: {url: 'true'},
        dataType: 'text',
        success: cb,
        error: onError || function() { return; }
      });
    },
    listShortcuts: function(cb, onError) {
      $.ajax({
        url: 'go/shortcuts/',
        type: 'GET',
        dataType: 'json',
        success: cb,
        error: onError || function() { return; }
      });
    },
    writeShortcut: function(shortcut, cb, onError) {
      $.ajax({
        url: 'go/shortcuts/' + shortcut.id,
        type: 'PUT',
        contentType: 'application/json; charset=UTF-8',
        dataType: 'text',
        data: JSON.stringify(shortcut),
        success: cb,
        error: onError || function() { return; }
      });
    },
    deleteShortcut: function(id, cb, onError) {
      $.ajax({
        url: 'go/shortcuts/' + id,
        type: 'DELETE',
        dataType: 'text',
        success: cb,
        error: onError || function() { return; }
      });
    }
  };

  const NoticeHandler = function($box) {
    const self = this;
    self.$box = $box;

    self.displayNotice = function(msg, type, mime) {
      mime = mime || 'plain';

      if (mime === 'plain') {
        self.$box.text(msg);
      } else {
        self.$box.html(msg);
      }

      self.$box.attr('data-message-type', type);
      self.$box.on('click', function() {
        self.$box.hide();
      });
      self.$box.show();
    };

    self.displayInfo = function(msg, mime) {
      self.displayNotice(msg, 'info', html);
    };
    self.displayError = function(msg, mime) {
      self.displayNotice(msg, 'error', mime);
    };
    self.displaySuccess = function(msg, mime) {
      self.displayNotice(msg, 'success', mime);
    };
  };

  const ShortcutList = function(noticeHandler, $box) {
    const self = this;
    self.noticeHandler = noticeHandler;
    self.$box = $box;
    self.infoBox = null;

    self.shortcuts = [];
    self.keywordIndex = {};
    self.knownTags = [];

    self.init = function(cb) {
      cb = cb || function() {};

      Client.listShortcuts(
        function(shortcuts) {
          self.shortcutsLoaded(shortcuts);
          cb(shortcuts);
        },
        function(response) {
          self.noticeHandler.displayError('Failed to load shortcut list!');
        }
      )
    };

    self.shortcutsLoaded = function(shortcuts) {
      self.shortcuts = shortcuts;

      self.buildIndex(self.shortcuts);
      self.render(self.shortcuts);

      EventBus.fireEvent(EventBus.SHORTCUTS_LOADED, shortcuts);
    };

    self.byId = function(id) {
      for (let i = 0; i < self.shortcuts.length; i++) {
        const s = self.shortcuts[i];
        if (s.id === id) {
          return s;
        }
      }

      return null;
    };

    self.buildIndex = function(shortcuts) {
      const keywordIndex = {};

      for (let i = 0; i < shortcuts.length; i++) {
        const s = shortcuts[i];
        const keywords = [s.id, s.url].concat(s.tags);
        keywordIndex[s.id] = keywords;

        for (let j = 0; j < s.tags.length; j++) {
          const t = s.tags[j];

          if (self.knownTags.indexOf(t) === -1) {
            self.knownTags.push(t);
          }
        }
      };

      self.knownTags.sort();
      EventBus.fireEvent(EventBus.KEYWORDS_INDEXED, self.knownTags);

      self.keywordIndex = keywordIndex;
    };

    const writeShortcut = function(shortcut) {
      Client.writeShortcut(
        shortcut,
        function() {
          self.init();  // TODO: Be more incremental here
          self.noticeHandler.displaySuccess('Updated ' + shortcut.id);
        },
        function(response) {
          self.noticeHandler.displayError(
            'Unexpected error: ' + response.status + ' ' + response.statusText
          );
        }
      );
    };

    self.createShortcut = function(shortcut) {
      if (self.byId(shortcut.id)) {
        self.noticeHandler.displayError(
          'A shortcut with that name already exists; edit it instead.'
        );
        return false;
      }

      writeShortcut(shortcut);
      return true;
    };

    self.updateShortcut = writeShortcut;

    self.deleteShortcut = function(id) {
      // FIXME: Reuse code from writeShortcut
      Client.deleteShortcut(
        id,
        function() {
          self.init()  // TODO: Be more incremental here
          self.noticeHandler.displaySuccess('Deleted ' + id);
        },
        function(response) {
          self.noticeHandler.displayError(
            'Unexpected error: ' + response.status + ' ' + response.statusText
          );
        }
      );
    };

    const renderShortcutTable = function(shortcuts) {
      if (!shortcuts) {
        return $('<span>').text('No shortcuts exist yet');
      }

      const $table = $('<table>');
      const $tbody = $('<tbody>');

      for (let i = 0; i < shortcuts.length; i++) {
        const s = shortcuts[i];
        const $tr = $('<tr>').attr('data-shortcut', s.id);
        const $shortcut = $('<td>').addClass('shortcut');

        const truncation = Utils.truncate(s.id, SHORTCUT_TRUNCATE_LENGTH);
        if (truncation.isTruncated) {
          $shortcut.attr('title', 'go/' + s.id);
        }
        $shortcut.html(
          $('<button>')
            .attr('data-id', s.id)
            .on('click', function() {
              if (self.infoBox) {
                self.infoBox.loadEditShortcutForm(($(this).attr('data-id')));
              }
              return false;
            })
            .text('go/' + truncation.truncated)
        );

        const $url = $('<td>').addClass('url');
        $url.html(
          $('<a>')
            .attr('href', s.url)
            .attr('target', '_blank')
            .text(Utils.truncate(s.url, URL_TRUNCATE_LENGTH).truncated)
        );

        const $modified = $('<td>').addClass('time').text(Utils.reformatDate(s.modified_on));

        $tr.html($shortcut);
        $tr.append($url);
        $tr.append($modified);

        $tbody.append($tr);
      }

      $table.html($tbody);
      return $table;
    };

    self.render = function(shortcuts) {
      self.$box.html(renderShortcutTable(shortcuts));
    };

    // Shows only the rows with the specified IDs
    const filterIds = function(ids) {
      const $rows = self.$box.find('table tr');

      $rows.each(function() {
        const $this = $(this);
        const id = $this.attr('data-shortcut');

        if (ids.includes(id)) {
          $this.show();
        } else {
          $this.hide();
        }
      });
    };

    // Hide rows which don't match the given regex in id, url, or tags fields
    self.applyFilter = function(s) {
      const r = new RegExp(s);
      const $rows = self.$box.find('table tr');

      // FIXME: Use the structured data instead, why would I do it like this? :(

      $rows.each(function() {
        const $this = $(this);
        const id = $this.attr('data-shortcut');
        const keywords = self.keywordIndex[id] || [];

        const hasMatch = false;
        for (let i = 0; i < keywords.length; i++) {
          if (keywords[i].match(r)) {
            hasMatch = true;
            break;
          }
        }

        if (hasMatch) {
          $this.show();
        } else {
          $this.hide();
        }
      });
    };

    // Hide rows which don't contain all of the given tags
    self.applyTagFilter = function(tags) {
      let selected = self.shortcuts;

      tags.forEach(function(t) {
        selected = selected.filter(s => s.tags.includes(t));
      });

      filterIds(selected.map(s => s.id));
    };

    // Sort by the given shortcut attribute
    self.sortRows = function(attr, reverse) {
      attr = attr || 'id';
      const reverseMod = reverse ? -1 : 1;

      self.shortcuts.sort(function(s1, s2) {
        if (s1[attr] < s2[attr]) {
          return -1 * reverseMod;
        }
        if (s1[attr] > s2[attr]) {
          return 1 * reverseMod;
        }
        return 0;
      });

      self.render(self.shortcuts);
    };

    self.sortAlphabetical = function() {
      self.sortRows('id', false);
    };

    self.sortChronological = function() {
      self.sortRows('modified_on', true);
    };
  };

  const InfoBox = function(shortcuts, $box) {
    const self = this;
    self.shortcuts = shortcuts;
    self.$box = $box;

    $('body').on('click', function(e) {
      if (
        !self.$box.is(e.target) &&
        !$.contains(self.$box[0], e.target) &&
        $.contains(document, e.target)
      ) {
        self.hide();
      }
    });

    self.hide = function() {
      if (window.location.hash.startsWith('#/shortcut')) {
        window.location.hash = '#/';
      }
      self.$box.hide();
    };

    self.loadEditShortcutForm = function(id) {
      window.location.hash = '#/shortcut/' + id;

      const shortcut = self.shortcuts.byId(id);
      if (!shortcut) {
        return;
      }
      self.$box.html($('<h2>').text('go/' + shortcut.id));

      const $discard = $('<button>').addClass('discard').text('🗑️');
      $discard.on('dblclick', function() {
        self.shortcuts.deleteShortcut(id);
      });
      self.$box.append($discard);

      const $form = Forms.updateShortcut.render(shortcut, function(updated) {
        self.shortcuts.updateShortcut(updated);
      });
      self.$box.append($form);
      self.$box.show();
      self.$box.find('[data-field="url"] input').focus();
    };

    self.loadCreateShortcutForm = function() {
      const $form = Forms.createShortcut.render({}, function(newShortcut) {
        self.shortcuts.createShortcut(newShortcut);
      });
      self.$box.html($form);
      self.$box.show();
      self.$box.find('[data-field="id"] input').focus();
    };
  };

  const Home = function(shortcuts, shortcutTools, tagFilters) {
    const self = this;

    self.shortcuts = shortcuts;
    self.shortcutTools = shortcutTools;
    self.tagFilters = tagFilters;

    self.init = function(cb) {
      self.tagFilters.init();

      self.shortcuts.init(function() {
        if (cb) {
          cb();
        }
        self.shortcutTools.init();
      });
    };

  };

  const TagFilters = function(shortcutsWidget, $box) {
    const self = this;

    self.$box = $box;
    self.shortcutsWidget = shortcutsWidget;

    self.sortedTags = [];
    self.activeFilters = [];

    // Toggle filtering by the clicked tag and recalculate everything as appropriate + tell the
    // shortcut widget to filter based on our latest filters as well
    const onClick = function(tag) {
      if (self.activeFilters.includes(tag)) {
        self.activeFilters.splice(self.activeFilters.indexOf(tag), 1);
      } else {
        self.activeFilters.push(tag);
      }

      refreshTags();
      self.shortcutsWidget.applyTagFilter(self.activeFilters);
    };

    // Recalculate filteredShortcutsByTag based on current filters and update sortedTags,
    // which list tags by shortcut count
    const refreshTags = function(shortcuts) {
      let filtered = shortcuts || self.shortcutsWidget.shortcuts;
      self.activeFilters.forEach(function(t) {
        filtered = filtered.filter(s => s.tags.includes(t));
      });

      let countsByTag = {};
      filtered.forEach(function(s) {
        s.tags.forEach(function(t) {
          countsByTag[t] = countsByTag[t] || 0;
          countsByTag[t]++;
        });
      });

      const ordered = Object.keys(countsByTag).map(function(t) {
        return {tag: t, count: countsByTag[t]};
      });
      ordered.sort((a, b) => b.count - a.count);
      self.sortedTags = ordered;

      self.render();
    };

    const renderTag = function(tagSummary) {
      const t = tagSummary.tag;
      const count = tagSummary.count;

      const col = Utils.createColour(t);
      const label = self.activeFilters.includes(t) ? t : `${t} (${count})`;
      const $elem = $('<button>').addClass('tag').css({background: col}).text(label);

      if (self.activeFilters.includes(t)) {
        $elem.addClass('active');
      }

      $elem.on('click', () => onClick(t));

      return $elem;
    };

    self.render = function() {
      self.$box.empty();

      self.sortedTags.forEach(function(e) {
        self.$box.append(renderTag(e));
      });
    };

    self.init = function() {
      EventBus.subscribe(EventBus.SHORTCUTS_LOADED, refreshTags);
    };
  }

  const ShortcutTools = function(shortcuts, infoBox, $box) {
    const self = this;

    self.$box = $box;
    self.shortcuts = shortcuts;
    self.infoBox = infoBox;

    self.$create = self.$box.find('.create');
    self.$sort = self.$box.find('.sort');
    self.$filter = self.$box.find('.filter');

    let isSubscribed = false;

    const onShortcutsLoaded = function() {
      self.shortcuts.applyFilter(self.$filter.find('input').val());
    };

    self.init = function() {
      const $add = self.$create.find('.add');
      const $alpha = self.$sort.find('.alpha');
      const $chrono = self.$sort.find('.chrono');

      $add.on('click', function() {
        self.infoBox.loadCreateShortcutForm();
        return false;
      });
      $alpha.on('click', self.shortcuts.sortAlphabetical);
      $chrono.on('click', self.shortcuts.sortChronological);

      const $filterBox = self.$filter.find('input');
      $filterBox.on('input', function() {
        self.shortcuts.applyFilter($(this).val());
      });

      if (!isSubscribed) {
        EventBus.subscribe(EventBus.SHORTCUTS_LOADED, onShortcutsLoaded);
        isSubscribed = true;
      }
    };
  };

  const Go = function(cfg) {
    const self = this;
    cfg = cfg || {};

    self.noticeHandler = new NoticeHandler(cfg.$notices);
    self.shortcuts = new ShortcutList(self.noticeHandler, cfg.$shortcuts);
    self.infoBox = new InfoBox(self.shortcuts, cfg.$infoBox);
    self.shortcuts.infoBox = self.infoBox;
    self.shortcutTools = new ShortcutTools(self.shortcuts, self.infoBox, cfg.$shortcutTools);
    self.tagFilters = new TagFilters(self.shortcuts, cfg.$tagFilters);

    self.home = new Home(self.shortcuts, self.shortcutTools, self.tagFilters);

    if (cfg.onKeywordsIndexed) {
      EventBus.subscribe(EventBus.KEYWORDS_INDEXED, cfg.onKeywordsIndexed);
    }

    /**
     * Bind some keys to shortcut functions while not entering text
     */
    const handleShortcuts = function(e) {
      if (e.key === 'Escape') {
        self.infoBox.hide();
        document.activeElement.blur();
        return;
      }

      const $target = $(e.target);

      if ($target.is('input') || $target.is('form *')) {
        return;
      }

      if (e.key === 'a') {
        self.infoBox.loadCreateShortcutForm();
        return false;
      }

      if (e.key === '/') {
        self.shortcutTools.$filter.find('input').focus();
        e.preventDefault();
        return false;
      }

    };

    const bindShortcuts = function() {
      $(document).on('keydown', handleShortcuts);
    };

    const routeRequest = function() {
      const frag = window.location.hash;

      if (frag) {
        if (frag.startsWith('#/go/')) {
          const shortcut = frag.split('/')[2];
          Redirector.redirect(
            shortcut,
            function(response) {
              if (response.status === 404) {
                self.noticeHandler.displayError(
                  'Shortcut <strong>' + shortcut + '</strong> does not exist.', 'html'
                );
              } else {
                self.noticeHandler.displayError(
                  'Unexpected error: ' + response.status + ' ' + response.statusText
                );
              }

              self.home.init();
            }
          );
          return;
        }

        if (frag.startsWith('#/shortcut/')) {
          bindShortcuts();
          self.home.init(function() {
            self.infoBox.loadEditShortcutForm(frag.split('/')[2]);
          });
          return;
        }
      }

      bindShortcuts();
      self.home.init();
    };

    self.init = routeRequest;
  };

  window.Go = Go;
})(jQuery, Utils, Forms);
