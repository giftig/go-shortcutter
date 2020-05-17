(function($) {
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
    // Truncate a stirng to 16 (or n) chars by adding an ellipsis
    // Return a summary of the whole operation
    truncate: function(s, n) {
      n = n || 16;

      var isTruncated = false;
      var truncated = s;

      if (s.length > n) {
        truncated = s.slice(0, n);
        isTruncated = true;
      }

      return {
        full: s,
        truncated: truncated,
        isTruncated: isTruncated
      };
    },
    reformatDate: function(dt) {
      return dt;
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
      console.log(msg, type, mime);
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

  var NewShortcuts = function(noticeHandler, nav, $box) {
    var self = this;
    self.noticeHandler = noticeHandler;
    self.nav = nav;
    self.$box = $box;

    self.init = function() {
      Client.listShortcuts(
        self.render,
        function(response) {
          self.noticeHandler.displayError('Failed to load shortcut list!');
        }
      )
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
        var $tr = $('<tr>');
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
            .text(s.url)
        );

        var $created = $('<td>').addClass('time').text(Utils.reformatDate(s.created_on));

        $tr.html($shortcut);
        $tr.append($url);
        $tr.append($created);

        $tbody.append($tr);
      }

      $table.html($tbody);
      self.$box.html($table);
    }
  };

  var Nav = function() {
    var self = this;
    self.load = function(shortcut, onError) {
      window.location.hash = '#/shortcut/' + shortcut;
      console.log('Loading info for shortcut ' + shortcut);
    };
  };

  var MiniNav = function(nav, $box) {
    var self = this;
    self.nav = nav;
    self.$box = $box;

    self.render = function() {
      var $form = $('<form>').on('submit', function() {
        self.nav.load(self.$box.find('[data-name="shortcut"]').val());
        return false;
      });

      $form.html('go/');
      $form.append(
        $('<input>')
          .attr('data-name', 'shortcut')
          .addClass('underline')
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
    self.newShortcuts = cfg.newShortcuts;
    self.$box = cfg.$home;

    self.render = function() {
      self.newShortcuts.init();
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
    self.newShortcuts = new NewShortcuts(self.noticeHandler, self.nav, cfg.$newShortcuts);

    self.home = new Home({
      nav: self.nav,
      mininav: self.mininav,
      noticeHandler: self.noticeHandler,
      newShortcuts: self.newShortcuts,
      $home: cfg.$home
    });

    self.shortcutDetails = new ShortcutDetails({
      $details: cfg.$details
    });

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
