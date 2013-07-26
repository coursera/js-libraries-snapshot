define([
  "jquery",
  "underscore",
  "js/lib/schema",
  "js/lib/lucid",
  "js/lib/json2"],
function($, _, Schema, Lucid) {

  var defaults = {
    "attribute.prefix": "data-form",
    "attribute.ignore": "ignore",
    "attribute.previous": "prev-value",
    "attribute.schema": "schema",
    "attribute.filter": "filter",
    "attribute.properties": "properties",
    "attribute.required": "required",
    "class.warn": "warn"
  };

  var getForm = function(el, options) {
    var form = $(el).data('form.me');

    if (form && form.constructor === Form.prototype.constructor) {
      if (form) return form.customize(options);
      else return form;
    } else {
      return null;
    }
  };

  var makeForm = function(el, settings) {
    var $el = $(el);
    var form = getForm($el);

    // if popup hasn't been created, make one!
    if (!form) {
      form = new Form($el, settings);
      $el.data("form.me", form);
    }

    return form;
  };

  var validate = function($input, _rules) {
    var rules   = _rules || {};
    var rule    = {};
    var test    = {};
    var value   = $input.val();
    var id      = ($input.attr('name') || $input.attr('id'));
    var type    = $input.attr('type');

    if(rules.schema)
      rule.type = rules.schema;

    if(rules.filter)
      rule.filters = _.isString(rules.filter) ? (rules.filter || "").split(',') : rules.filter;

    if(rules.required)
      rule.required = true;

    if(rules.properties)
      rule.properties = _.isString(rules.properties) ? JSON.parse(rules.properties) : rules.properties;

    if((rules.schema || rules.filter || rules.required || rules.properties)) {
      rule.trim = true;
      test = Schema.test(value, rule);

      // need a special test for checkbox/radios
      if(/^checkbox|radio$/.test(type) && rule.required && !$input[0].checked)
        test.valid = false;

      if(!test.valid) {
        if(rules.required || value !== "") {
          throw test.errors.input;
        } else {
          value = null;
        }
      } else {
        if(_.isString(test.data.input) && value !== test.data.input) {
          value = test.data.input;
          $input.val(value);
        }
      }
    }

    return value;
  };

  var process = function() {
    var that    = this;
    var inputs  = this.$form.find(':input');
    var result  = {};
    var errors  = {};
    var valid   = true;
    var pattern = /^([^\[\]]+)(?:\[(.*)\])?$/;

    _.each(inputs, function(input) {

      var $input  = $(input);
      var type    = $input.attr('type');
      var value   = $input.val();
      var id      = ($input.attr('name') || $input.attr('id'));
      var names   = (id || "").split('.');
      var part    = result;
      var name    = names[0];
      var ignore  = $input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.ignore']) || /button|submit/.test(type);
      var schema  = $input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.schema']) ||
                    $input.data(that.options['attribute.prefix'] + '-' + that.options['attribute.schema']);
      var filter  = $input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.filter']) ||
                    $input.data(that.options['attribute.prefix'] + '-' + that.options['attribute.filter']);
      var props   = $input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.properties']) ||
                    $input.data(that.options['attribute.prefix'] + '-' + that.options['attribute.properties']);
      var required= $input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.required']) !== undefined;

      if(!(ignore || (value === $input.data(that.options['attribute.prefix'] + "-" + "prev-value") && names.length === 1 && !/\[.*\]/.test(id)))) {

        if($input.data(that.options['attribute.prefix'] + '-dirty')) {
          try {
            value = validate($input, {schema:schema, filter:filter, required:required, properties:props});
          } catch(e) {
            valid = false;
            errors[id] = e;
          }
        } else {
          valid = $input.data(that.options['attribute.prefix'] + '-valid');
          errors[id] = $input.data(that.options['attribute.prefix'] + '-error');
        }

        for(var i = 0, match = null; i < names.length; i++) {
          var last = i === names.length - 1;

          match = names[i].match(pattern);
          name = match ? match[1] : names[i];

          if(match) {
            var index = match[2];

            if(part[name] === undefined) {
              if(!last) {
                part[name] = index === undefined ? {} : [];
              } else if(index === undefined) {
                part[name] = value;
              } else {
                part[name] = [];
                part[name][index] = value;
              }
            } 

            if(!last) {
              if(index !== undefined) {
                if(part[name][index])
                  part = part[name][index];
                else
                  part = part[name][index] = {};
              }
              else
                part = part[name];
            } else {
              part[name] = value;
            }
          }
        }
      }

      return {data:result, errors:errors};
    });

    return {
      valid: valid,
      errors: errors,
      data: result
    };
  };

  var prepare = function() {
    var that    = this;
    var inputs  = this.$form.find(':input');

    _.each(inputs, function(input) {
      var $input = $(input);

      if(!$input.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.ignore']) && !(/button|submit/.test($input.attr('type')))) {
        $input.data(that.options['attribute.prefix'] + '-' + that.options['attribure.previous'], $input.val());
        $input.data(that.options['attribute.prefix'] + '-dirty', true);
      }
    });

    var validateIt = function(e) {
      that.validate(e.currentTarget);
    };

    var blurIt = function(e) {
      var $el = $(e.currentTarget);
      that.emitter.trigger('blur', e, {
        valid: $el.data(that.options['attribute.prefix'] + '-valid'),
        error: $el.data(that.options['attribute.prefix'] + '-error')
      });
    };

    this.$form.on("change", ":input", validateIt);
    this.$form.on("blur", ":input", blurIt);
    this.$form.on("keydown cut paste", ":input", _.debounce(validateIt, 500));
    this.$form.on('submit', function(e) {
      that.emitter.trigger('submit', e, process.call(that));
    });
  };

  var Form = function(form, _options) {
    var that      = this;
    this.$form    = $(form);
    this.customize(_options);

    _.bindAll(this, 'validate');

    // store previous values, add handlers for change/keyup/submit
    prepare.call(this, this.$form);
    this.emitter = Lucid.emitter(this);
  };

  Form.prototype.customize = function(_options) {
    this.options  = _.extend({}, defaults, _options || {});
    return this;
  };

  Form.prototype.process = function() {
    return process.call(this);
  };

  Form.prototype.validate = function(el) {
    var that = this;
    var $el = $(el);

    var schema  = $el.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.schema']) ||
      $el.data(that.options['attribute.prefix'] + '-' + that.options['attribute.schema']);
    var filter  = $el.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.filter']) ||
      $el.data(that.options['attribute.prefix'] + '-' + that.options['attribute.filter']);
    var props   = $el.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.properties']) ||
      $el.data(that.options['attribute.prefix'] + '-' + that.options['attribute.properties']);
    var required= $el.attr(that.options['attribute.prefix'] + '-' + that.options['attribute.required']) !== undefined;

    var event = $.Event(null, {currentTarget: $el.get(0)});

    try {
      validate($el, {schema:schema, filter:filter, required:required, properties:props});
      if($el.hasClass(that.options['class.warn'])) {
        $el.removeClass(that.options['class.warn']);
        event.type = 'forms:corrected';
        that.emitter.trigger('corrected', event);
      }
      $el.data(that.options['attribute.prefix'] + '-valid', true);
      $el.data(that.options['attribute.prefix'] + '-error', null);
      event.type = 'forms:change';
      that.emitter.trigger('change', event, {valid:true});
    } catch(error) {
      if(!$el.hasClass(that.options['class.warn'])) {
        $el.addClass(that.options['class.warn']);
        event.type = 'forms:error';
        that.emitter.trigger('error', event, error);
      }
      $el.data(that.options['attribute.prefix'] + '-valid', false);
      $el.data(that.options['attribute.prefix'] + '-error', error);
      event.type = 'forms:change';
      that.emitter.trigger('change', event, {valid:false, error:error});
    }
    $el.data(that.options['attribute.prefix'] + '-dirty', false);
  };

  var external = function() {
    return getForm.apply(null, arguments) || makeForm.apply(this, arguments);
  };

  return external;
});
