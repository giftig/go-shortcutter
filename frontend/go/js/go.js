(function($, Utils, Forms) {
  var SHORTCUT_TRUNCATE_LENGTH = 16;
  var URL_TRUNCATE_LENGTH = 50;

  var Redirector = {
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

  var Client = {
    getUrl: function(shortcut, cb, onError) {
      var clientUrl = '/go/shortcuts/' + shortcut;

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

  var NoticeHandler = function($box) {
    var self = this;
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

  var ShortcutList = function(noticeHandler, $box) {
    var self = this;
    self.noticeHandler = noticeHandler;
    self.$box = $box;
    self.showInfo = function() {};

    self.keywordIndex = {};

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
    };

    self.byId = function(id) {
      for (var i = 0; i < self.shortcuts.length; i++) {
        var s = self.shortcuts[i];
        if (s.id === id) {
          return s;
        }
      }

      return null;
    };

    self.buildIndex = function(shortcuts) {
      var keywordIndex = {};

      for (var i = 0; i < shortcuts.length; i++) {
        var s = shortcuts[i];
        var keywords = [s.id, s.url];
        keywords.concat(s.tags);
        keywordIndex[s.id] = keywords;
      };

      self.keywordIndex = keywordIndex;
    };

    self.writeShortcut = function(shortcut) {
      Client.writeShortcut(
        shortcut,
        function() {
          self.init()  // TODO: Be more incremental here
          self.noticeHandler.displaySuccess('Updated ' + shortcut.id);
        },
        function(response) {
          self.noticeHandler.displayError(
            'Unexpected error: ' + response.status + ' ' + response.statusText
          );
        }
      );
    };

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

    self.render = function(shortcuts) {
      if (!shortcuts) {
        self.$box.text('No shortcuts exist yet.');
        return;
      }
      var $table = $('<table>');
      var $tbody = $('<tbody>');

      for (var i = 0; i < shortcuts.length; i++) {
        var s = shortcuts[i];
        var $tr = $('<tr>').attr('data-shortcut', s.id);
        var $shortcut = $('<td>').addClass('shortcut');

        var truncation = Utils.truncate(s.id, SHORTCUT_TRUNCATE_LENGTH);
        if (truncation.isTruncated) {
          $shortcut.attr('title', 'go/' + s.id);
        }
        $shortcut.html(
          $('<button>')
            .attr('data-id', s.id)
            .on('click', function() {
              self.showInfo($(this).attr('data-id'));
              return false;
            })
            .text('go/' + truncation.truncated)
        );

        var $url = $('<td>').addClass('url');
        $url.html(
          $('<a>')
            .attr('href', s.url)
            .attr('target', '_blank')
            .text(Utils.truncate(s.url, URL_TRUNCATE_LENGTH).truncated)
        );

        var $modified = $('<td>').addClass('time').text(Utils.reformatDate(s.modified_on));

        $tr.html($shortcut);
        $tr.append($url);
        $tr.append($modified);

        $tbody.append($tr);
      }

      $table.html($tbody);
      self.$box.html($table);
    };

    // Hide rows which don't match the given regex in id, url, or tags fields
    self.applyFilter = function(s) {
      var r = new RegExp(s);
      var $rows = self.$box.find('table tr');

      $rows.each(function() {
        var $this = $(this);
        var id = $this.attr('data-shortcut');
        var keywords = self.keywordIndex[id] || [];

        var hasMatch = false;
        for (var i = 0; i < keywords.length; i++) {
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

    // Sort by the given shortcut attribute
    self.sortRows = function(attr, reverse) {
      attr = attr || 'id';
      var reverseMod = reverse ? -1 : 1;

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

  var InfoBox = function(shortcuts, $box) {
    var self = this;
    self.shortcuts = shortcuts;
    self.$box = $box;

    $('body').on('click', function(e) {
      if (!self.$box.is(e.target) && !$.contains(self.$box[0], e.target)) {
        self.hide();
      }
    });

    self.hide = function() {
      window.location.hash = '#';
      self.$box.hide();
    };

    self.load = function(id) {
      window.location.hash = '#/shortcut/' + id;

      var shortcut = self.shortcuts.byId(id);
      if (!shortcut) {
        return;
      }
      self.$box.html($('<h2>').text('go/' + shortcut.id));

      var $discard = $('<button>').addClass('discard').text('🗑️');
      $discard.click(function() {
        // FIXME: Add a confirmation modal
        self.shortcuts.deleteShortcut(id);
      });
      self.$box.append($discard);

      var $form = Forms.updateShortcut.render(shortcut, function(updated) {
        self.shortcuts.writeShortcut(updated);
      });
      self.$box.append($form);
      self.$box.show();
    };
  };

  var Home = function(shortcuts, searchTools) {
    var self = this;

    self.shortcuts = shortcuts;
    self.searchTools = searchTools;

    self.init = function(cb) {
      self.shortcuts.init(cb);
      self.searchTools.init();
    };

  };

  var SearchTools = function(shortcuts, $box) {
    var self = this;

    self.$box = $box;
    self.shortcuts = shortcuts;

    self.$sort = self.$box.find('.sort');
    self.$filter = self.$box.find('.filter');

    self.init = function() {
      var $alpha = self.$sort.find('.alpha');
      var $chrono = self.$sort.find('.chrono');

      $alpha.on('click', self.shortcuts.sortAlphabetical);
      $chrono.on('click', self.shortcuts.sortChronological);

      self.$filter.find('input').on('input', function() {
        self.shortcuts.applyFilter($(this).val());
      });
    };
  };

  var Go = function(cfg) {
    var self = this;
    cfg = cfg || {};

    self.noticeHandler = new NoticeHandler(cfg.$notices);
    self.shortcuts = new ShortcutList(self.noticeHandler, cfg.$shortcuts);
    self.infoBox = new InfoBox(self.shortcuts, cfg.$infoBox);
    self.shortcuts.showInfo = self.infoBox.load;
    self.searchTools = new SearchTools(self.shortcuts, cfg.$searchTools);

    self.home = new Home(self.shortcuts, self.searchTools);

    var routeRequest = function() {
      var frag = window.location.hash;

      if (frag) {
        if (frag.startsWith('#/go/')) {
          var shortcut = frag.split('/')[2]
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
          self.home.init(function() {
            self.infoBox.load(frag.split('/')[2]);
          });
          return;
        }
      }

      self.home.init();
    };

    self.init = routeRequest;
  };

  window.Go = Go;
})(jQuery, Utils, Forms);
