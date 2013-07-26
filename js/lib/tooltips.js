define([
  "jquery",
  "underscore",
  "backbone"
  ],

function($, _, Backbone) {
  var _private = {
    defaults: {
      'bind.open': 'mouseenter',
      'bind.close': 'mouseleave',
      'animate.in.type': 'custom',
      'animate.in.from': '{"opacity":0}',
      'animate.in.to': '{"opacity":0.8}',
      'animate.in.duration': 200,
      'animate.out.type': 'custom',
      'animate.out.from': '{"opacity":0.8}',
      'animate.out.to': '{"opacity":0}',
      'animate.out.duration': 200,
      'position': 'top',
      'style': 'tooltip',
      'style.z-index': 1000000,
      'offset': 10,
      'attribute.tooltip': 'data-tooltip'
    },

    tooltip: $("<div>"),

    getTooltip: function(el, options) {
      var tooltip = $(el)
        .data("tooltip.me");

      if (tooltip && tooltip.constructor == Tooltip.prototype.constructor) {
        _private.build.call(tooltip, options ? options.text : null);

        if (options) return tooltip.customize(options);
        else return tooltip;
      } else {
        return null;
      }
    },

    makeTooltip: function(el, settings) {
      var $el = $(el);
      var tooltip = _private.getTooltip($el);

      // if popup hasn't been created, make one!
      if (!tooltip) {
        tooltip = new Tooltip($el, settings);
        $el.data("tooltip.me", tooltip);
      }

      _private.build.call(tooltip, settings ? settings.text : null);
      return tooltip;
    },

    show: function() {
      this.trigger('show', this);
    },

    close: function() {
      this.$tooltip.hide()
        .remove();
      this.trigger('close', this);
    },

    build: function(_text) {
      var arrow = $("<div>")
        .addClass(this.options['style'] + '-arrow');
      var inner = $("<div>")
        .addClass(this.options['style'] + '-inner');
      var text = _text || this.$el.attr(this.options['attribute.tooltip']);

      this.$tooltip = _private.tooltip.empty()
        .remove()
        .removeClass()
        .stop(true, true)
        .addClass(this.options['style'])
        .addClass(this.options['position'])
        .css({
        'visibility': 'hidden',
        position: 'absolute',
        display: 'block',
        'z-index': this.options['style.z-index']
      })
        .append(arrow)
        .append(inner.html(text));
    },

    readDataAttributes: function($anchor, prefix, defaults) {
      var settings = {};

      for (var key in defaults) {
        var attr = $anchor.attr(prefix + key.replace(/\./g, '-'))
        settings[key] = attr === undefined ? defaults[key] : attr;
      }

      return settings;
    }
  };

  var Tooltip = function(el, settings) {
    this.$el = $(el);
    this.customize(settings);
  };

  Tooltip.prototype.customize = function(settings) {
    this.options = _.extend({}, _private.defaults, settings);

    if(this.options['offset'])
      this.options['offset'] = parseInt(this.options['offset'], 10) || 0;

    return this;
  };

  Tooltip.prototype.open = function() {
    var that = this;
    var position = this.$el.offset();
    var position2 = this.$tooltip.appendTo('body').offset();
    var width = this.$el.outerWidth();
    var height = this.$el.outerHeight();
    var width2 = this.$tooltip.outerWidth();
    var height2 = this.$tooltip.outerHeight();
    var middleW = position.left + width / 2;
    var middleH = position.top + height / 2;

    if (this.options.position == 'top') this.$tooltip.css({
      left: middleW - width2 / 2,
      top: position.top - height2 - this.options.offset
    });
    else if (this.options.position == 'left') this.$tooltip.css({
      left: position.left - width2 - this.options.offset,
      top: middleH - height2 / 2
    });
    else if (this.options.position == 'right') this.$tooltip.css({
      left: position.left + width + this.options.offset,
      top: middleH - height2 / 2
    });
    else this.$tooltip.css({
      left: middleW - width2 / 2,
      top: position.top + height + this.options.offset
    });

    if (this.options['animate.in.type'] == 'custom') {
      if (this.options['animate.in.from']) {
        if (_.isObject(this.options['animate.in.from'])) this.$tooltip.css(this.options['animate.in.from']);
        else if (_.isString(this.options['animate.in.from'])) this.$tooltip.css($.parseJSON(this.options['animate.in.from']));
      }

      this.$tooltip.css({
        visibility: 'visible',
        display: 'block'
      });

      if (this.options['animate.in.to']) {
        if (_.isObject(this.options['animate.in.to'])) {
          this.$tooltip.animate(this.options['animate.in.to'], {
            duration: this.options['animate.in.duration'],
            complete: _.bind(_private.show, this)
          });
        } else if (_.isString(this.options['animate.in.to'])) {
          this.$tooltip.animate($.parseJSON(this.options['animate.in.to']), {
            duration: this.options['animate.in.duration'],
            complete: _.bind(_private.show, this)
          });
        }
      }

    } else {
      this.trigger('opening', this);
      this.$tooltip.css({
        display: 'block'
      });
      _private.show.call(this);
    }

    return this;
  };

  Tooltip.prototype.close = function() {
    if (this.options['animate.out.type'] == 'custom') {
      if (this.options['animate.out.from']) {
        if (_.isObject(this.options['animate.out.from'])) this.$tooltip.css(this.options['animate.out.from']);
        else if (_.isString(this.options['animate.out.from'])) this.$tooltip.css($.parseJSON(this.options['animate.out.from']));
      }

      if (this.options['animate.out.to']) {
        if (_.isObject(this.options['animate.out.to'])) {
          this.$tooltip.animate(this.options['animate.out.to'], {
            duration: this.options['animate.out.duration'],
            complete: _.bind(_private.close, this)
          });
        } else if (_.isString(this.options['animate.out.to'])) {
          this.$tooltip.animate($.parseJSON(this.options['animate.out.to']), {
            duration: this.options['animate.out.duration'],
            complete: _.bind(_private.close, this)
          });
        }
      }

      this.trigger("closing", this);
    } else {
      this.trigger('closing', this);
      _private.close.call(this);
    }
  };

  _.extend(Tooltip.prototype, Backbone.Events);

  var external = function() {
    return _private.getTooltip.apply(null, arguments) || _private.makeTooltip.apply(this, arguments);
  };

  external.start = function(view, _options) {
    var $view = $(view);
    var options = _.extend({}, _private.defaults, _options);

    $view.on(options['bind.open'] + ".tooltip", "[" + options['attribute.tooltip'] + "]", function(e) {
      var $anchor = $(this);

      if ($anchor.attr('disabled') != 'disabled') {

        options = _.extend({}, options, _private.readDataAttributes($anchor, 'data-tooltip-', _private.defaults));
        var tooltip = _private.makeTooltip($anchor, options);

        if ($anchor.attr(options['attribute.tooltip'])) {
          tooltip.open()
            .on('open', function() {
            $anchor.data('tooltip.it', tooltip);
          })
            .on('close', function() {
            $anchor.data('tooltip.it', null);
          });
        }
      }
    });

    $view.on(options['bind.close'] + ".tooltip", "[" + options['attribute.tooltip'] + "]", function(e) {
      var $anchor = $(this);
      options = _.extend({}, options, _private.readDataAttributes($anchor, 'data-tooltip-', _private.defaults));
      var tooltip = _private.getTooltip($anchor, options);

      if (tooltip) tooltip.close();
    });
  };

  external.stop = function(view) {
    var $view = $(view);
    var pop = $view.data("tooltip.it");

    $view.off(".tooltip");

    if (tooltip) tooltip.close();
  };

  // kick it off!
  external.start('body');

  return external;

});
