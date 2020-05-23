(function($) {
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

  var Utils = {
    // Truncate a stirng to n chars by adding an ellipsis
    // Return a summary of the whole operation
    truncate: function(s, n) {
      n = n || SHORTCUT_TRUNCATE_LENGTH;

      var isTruncated = false;
      var truncated = s;

      if (s.length > n) {
        truncated = s.slice(0, n - 3) + '...';
        isTruncated = true;
      }

      return {
        full: s,
        truncated: truncated,
        isTruncated: isTruncated
      };
    },
    reformatDate: function(dt) {
      var _zeroPad = function(n) {
        return n >= 10 ? n + '' : '0' + n;
      };

      var parsed = new Date(Date.parse(dt));
      return (
        parsed.getFullYear() + '-' +
        _zeroPad(parsed.getMonth()) + '-' +
        _zeroPad(parsed.getDate()) + ' ' +
        _zeroPad(parsed.getHours()) + ':' +
        _zeroPad(parsed.getMinutes()) + ':' +
        _zeroPad(parsed.getSeconds())
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

  var ShortcutList = function(noticeHandler, nav, $box) {
    var self = this;
    self.noticeHandler = noticeHandler;
    self.nav = nav;
    self.$box = $box;

    self.keywordIndex = {};

    self.init = function() {
      Client.listShortcuts(
        self.shortcutsLoaded,
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

        var truncation = Utils.truncate(s.id);
        if (truncation.isTruncated) {
          $shortcut.attr('title', 'go/' + s.id);
        }
        $shortcut.html(
          $('<button>')
            .on('click', function() {
              nav.load(s.id);
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

  var Nav = function($box) {
    var self = this;
    self.$box = $box;

    self.load = function(shortcut, onError) {
      window.location.hash = '#/shortcut/' + shortcut;
    };
  };

  var MiniNav = function(nav, $box) {
    var self = this;
    self.nav = nav;
    self.$box = $box;
    self.applyFilter = function() {};

    self.render = function() {
      var $form = $('<form>').on('submit', function() {
        self.nav.load(self.$box.find('[data-name="shortcut"]').val());
        return false;
      });

      $form.html('/');
      $form.append(
        $('<input>')
          .attr('data-name', 'shortcut')
          .addClass('underline')
          .on('input', function() {
            self.applyFilter($(this).val());
          })
          .attr('maxlength', 128)
      );

      self.$box.html($form);
    };
  };

  var Home = function(cfg) {
    var self = this;

    self.nav = cfg.nav;
    self.mininav = cfg.mininav;
    self.noticeHandler = cfg.noticeHandler;
    self.shortcuts = cfg.shortcuts;
    self.$box = cfg.$home;

    self.render = function() {
      self.shortcuts.init();
      self.mininav.render();

      $('section.content').hide();
      self.$box.show();
    };
  };

  var ShortcutDetails = function(cfg) {
    var self = this;

    self.$box = cfg.$details;

    self.render = function() {
      $('section.content').hide();
      self.$box.show();
    };
  };

  var Go = function(cfg) {
    var self = this;
    cfg = cfg || {};

    self.nav = new Nav();
    self.mininav = new MiniNav(self.nav, cfg.$miniNav);
    self.noticeHandler = new NoticeHandler(cfg.$notices);
    self.shortcuts = new ShortcutList(self.noticeHandler, self.nav, cfg.$shortcuts);

    self.home = new Home({
      nav: self.nav,
      mininav: self.mininav,
      noticeHandler: self.noticeHandler,
      shortcuts: self.shortcuts,
      $home: cfg.$home
    });

    self.shortcutDetails = new ShortcutDetails({
      $details: cfg.$details
    });

    self.mininav.applyFilter = self.shortcuts.applyFilter;

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

              self.home.render();
            }
          );
          return;
        }

        if (frag.startsWith('#/shortcut/')) {
          self.nav.load(frag.split('/')[2], self.home.render);
          return;
        }
      }

      self.home.render();
    };

    self.init = routeRequest;
  };

  window.Go = Go;
})(jQuery);
