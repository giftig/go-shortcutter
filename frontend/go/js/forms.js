(function($, Utils, Tagify) {

  var Widgets = {};

  Widgets.TextInput = function() {
    var self = this;

    self.render = function(initial) {
      self.initial = initial;
      self.$w = $('<input>').val(initial);
      return self.$w;
    };

    self.value = function() {
      return self.$w.val();
    };

    self.reset = function() {
      self.$w.val(self.initial);
    };
  };

  Widgets.Text = function(displayValue) {
    var self = this;

    displayValue = displayValue || function(v) { return v; };

    self.render = function(initial) {
      self.text = initial;

      return $('<span>').addClass('rawtext').text(displayValue(self.text));
    };

    self.value = function() {
      return self.text;
    };

    self.reset = function() {};
  };

  Widgets.CsvList = function() {
    var self = this;

    self.render = function(initial) {
      initial = initial || [];
      self.$w = $('<input>').addClass('csvlist').val(initial.join(','));

      return self.$w;
    };

    self.value = function() {
      return self.$w.val().split(',');
    };
  };

  Widgets.TagList = function(fetchTags) {
    var self = this;
    fetchTags = fetchTags || function() { return []; };

    self.render = function(initial) {
      initial = initial || [];
      self.$wrapper = $('<span>').addClass('taglist');
      self.$widget = $('<input>').val(JSON.stringify(initial));
      self.$wrapper.html(self.$widget);

      self.tagify = new Tagify(
        self.$widget[0],
        {
          placeholder: 'Tags',
          whitelist: fetchTags(),
          transformTag: function(data) {
            data.style = '--tag-bg:' + Utils.createColour(data.value);
          }
        }
      );

      return self.$wrapper;
    };

    self.value = function() {
      return self.tagify.value.map(function(v) {
        return v.value;
      });
    };
  };

  Widgets.DISPLAY_DATE = new Widgets.Text(Utils.reformatDate);

  var Validators = {};
  Validators.MaxLength = function(len) {
    var self = this;

    self.clean = function(v) {
      if (v && v.length > len) {
        throw 'Invalid length';
      }
      return v;
    };
  };

  Validators.EachItem = function(subvalidator) {
    var self = this;

    self.clean = function(v) {
      var res = [];

      for (var i = 0; i < v.length; i++) {
        res.push(subvalidator.clean(v[i]));
      }

      return res;
    };
  };

  Validators.Multiple = function(validators) {
    var self = this;

    self.clean = function(v) {
      var nextValue = v;

      for (var i = 0; i < validators.length; i++) {
        nextValue = validators[i].clean(nextValue);
      }

      return nextValue;
    };
  };

  Validators.NOOP = {clean: function(v) { return v; }};
  Validators.STRIP_WHITESPACE = {clean: function(v) { return v.trim(); }};


  var Field = function(cfg) {
    var self = this;
    self.id = cfg.id;
    self.label = cfg.label;
    self.validator = cfg.validator || Validators.NOOP;
    self.widget = cfg.widget;

    self.render = function(initialValue) {
      self.$label = $('<label>');
      self.$label.text(self.label);
      self.$widget = cfg.widget.render(initialValue);

      return [self.$label, self.$widget];
    };

    self.value = self.widget.value;

    self.clean = function() {
      return self.validator.clean(self.value());
    };
    self.reset = function() {
      self.widget.reset();
    };

  };

  var Form = function(fields) {
    var self = this;
    self.fields = fields;

    self.render = function(data, onSubmit) {
      var $form = $('<form>').on('submit', function() {
        onSubmit(self.clean());
        return false;
      });

      var $t = $('<table>');
      var $tbody = $('<tbody>');

      for (var i = 0; i < self.fields.length; i++) {
        var f = self.fields[i];
        var initialValue = data[f.id];
        var $widgets = f.render(initialValue);

        var $tr = $('<tr>').attr('data-field', f.id);
        var $label = $('<td>').html($widgets[0]);
        var $value = $('<td>').html($widgets[1]);

        $tr.html($label).append($value);
        $tbody.append($tr);
      }

      var $submitLine = $('<tr>').addClass('form-tools');
      var $submit = $('<td>').html($('<input>').attr('type', 'submit').val('Submit'));
      var $reset = $('<td>').html(
        $('<input>').attr('type', 'button').val('Reset').on('click', self.reset)
      );

      $submitLine.html($submit).append($reset);
      $tbody.append($submitLine);

      $t.html($tbody);
      $form.html($t);
      return $form;
    };

    self.clean = function() {
      var data = {};

      for (var i = 0; i < self.fields.length; i++) {
        var f = self.fields[i];
        data[f.id] = f.clean();
      }

      return data;
    };

    self.reset = function() {
      for (var i = 0; i < self.fields.length; i++) {
        self.fields[i].reset();
      }
    };
  };

  var Forms = {};

  // Will be populated in response to notifiers
  var registeredKeywords = [];

  var uneditableIdField = new Field({id: 'id', label: 'Shortcut', widget: new Widgets.Text()});
  var editableIdField = new Field({
    id: 'id',
    label: 'Shortcut',
    widget: new Widgets.TextInput(),
    validator: new Validators.MaxLength(64)
  });

  var commonShortcutFields = [
    new Field({id: 'label', label: 'Label', widget: new Widgets.TextInput()}),
    new Field({
      id: 'url',
      label: 'URL',
      widget: new Widgets.TextInput(),
      validator: new Validators.MaxLength(1024)
    }),
    new Field({
      id: 'tags',
      label: 'Tags',
      widget: new Widgets.TagList(function() { return registeredKeywords; }),
      validator: new Validators.EachItem(
        new Validators.Multiple([
          new Validators.MaxLength(64),
          Validators.STRIP_WHITESPACE
        ])
      )
    })
  ];

  var updateShortcutFields = [uneditableIdField].concat(commonShortcutFields).concat([
    new Field({id: 'created_on', label: 'Created on', widget: Widgets.DISPLAY_DATE}),
    new Field({id: 'modified_on', label: 'Modified on', widget: Widgets.DISPLAY_DATE})
  ]);
  var createShortcutFields = [editableIdField].concat(commonShortcutFields);

  Forms.createShortcut = new Form(createShortcutFields);
  Forms.updateShortcut = new Form(updateShortcutFields);
  Forms.onKeywordsIndexed = function(keywords) {
    registeredKeywords = keywords;
  };

  window.Forms = Forms;
})(jQuery, Utils, Tagify);
