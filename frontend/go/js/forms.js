(function($, Utils) {

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
  Validators.NOOP = {clean: function(v) { return v; }};


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

        var $tr = $('<tr>');
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
  Forms.shortcut = new Form([
    new Field({id: 'id', label: 'Shortcut', widget: new Widgets.Text()}),
    new Field({id: 'label', label: 'Label', widget: new Widgets.TextInput()}),
    new Field({id: 'url', label: 'URL', widget: new Widgets.TextInput(), validator: new Validators.MaxLength(1024)}),
    new Field({id: 'created_on', label: 'Created on', widget: Widgets.DISPLAY_DATE}),
    new Field({id: 'modified_on', label: 'Modified on', widget: Widgets.DISPLAY_DATE})
  ]);

  window.Forms = Forms;
})(jQuery, Utils);
