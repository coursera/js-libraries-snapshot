;(function() {

  var Affixes = function($, LucidJS, _) {

    var _private = {
      defaults: {
        "bind.scroll": "scroll",
        "attribute.affix": "data-affix",
        "offset.y": "0",
        "offset.x": "0",
        "class": "affix",
        "preserve": "1",
        "z.index":  "1000",
        "debounce": 500
      },

      getAffix: function(el, options) {
        var affix = $(el).data('affix.me');

        if (affix && affix.constructor == Affix.prototype.constructor) {
          if (options) return affix.customize(options);
          else return affix;
        } else {
          return null;
        }
      },

      makeAffix: function(el, options) {
        var $el = $(el);
        var affix = _private.getAffix($el);

        // if popup hasn't been created, make one!
        if (!affix) {
          affix = new Affix($el, options);
          $el.data("affix.me", affix);
        }

        return affix;
      },

      readDataAttributes: function($el, prefix, defaults) {
        var settings = {};

        for (var key in defaults) {
          var attr = $el.attr(prefix + key.replace(/\./g, '-'))
          settings[key] = attr === undefined || attr.length === 0 ? defaults[key] : attr;
        }

        return settings;
      }
    };

    var Affix = function(el, settings) {
      var that = this;

      this.$el = $(el);
      this.$parent = this.$el.parent();
      this.emitter = LucidJS.emitter(this);
      this.customize(settings);
      this.affixed = false;
    };

    Affix.prototype.customize = function(settings) {
      this.options = _.extend({}, _private.readDataAttributes(this.$el, _private["attribute.affix"] + "-", _private.defaults), settings);
      return this;
    };

    // currently only supports scrolling up and down =[
    Affix.prototype.reposition = function () {
      if (!this.$el.is(':visible')) return

      var scrollHeight = $(document).height(),
        scrollTop = $(window).scrollTop(),
        position = this.$el.offset(),
        offsetLeft = parseInt(this.options["offset.x"], 10) || 0,
        offsetTop = parseInt(this.options["offset.y"], 10) || 0;

      if(!this.affixed && (scrollTop > position.top + offsetTop)) {
        if(this.options["preserve"]) {
          this.restore = {
            display: this.$el.css('display'),
            "z-index": this.$el.css("z-index"),
            top:this.$el.css('top'), 
            left:this.$el.css('left'), 
            width:this.$el.css('width')};
          this.$el.css({
            display:'fixed', 
            top:offsetTop, 
            left:position.left,
            "z-index": this.options["z.index"],
            width:this.$el.width()});
        }
        this.position = position;
        this.$el.addClass(this.options["class"]);
        this.affixed = true;
        this.emitter.trigger("pin");
      } else if(this.affixed && (scrollTop <= this.position.top + offsetTop)) {
        this.$el.removeClass(this.options["class"]);
        if(this.options["preserve"]) {
          this.$el.css(this.restore);
          this.restore = {};
        }
        this.affixed = false;
        this.emitter.trigger("unpin");
      }
    };

    var external = function() {
      return _private.getAffix.apply(null, arguments) || _private.makeAffix.apply(this, arguments);
    };

    external.start = function(view, _options) {
      var $view   = $(view);
      var $domView = view == window ? $(document) : $view;
      var options = _.extend({}, _private.defaults, _options);

      $view.on(options['bind.scroll'] + ".affix", function() {
        $domView.find("[" + options["attribute.affix"] + "]").each(function() {
          var $affix = $(this);
          options = _.extend({}, options, _private.readDataAttributes($affix, options["attribute.affix"] + "-", _private.defaults));
          var affix = _private.getAffix($affix, options) || _private.makeAffix($affix, options);
          affix.reposition();
        });
      });
    };

    external.stop = function(view) {
      var $view = $(view);
      $view.unbind(".affix");
    };

    // kick it off!
    external.start(window);

    return external;
  };

  if (typeof define === "function" && define.amd) {
    define(['jquery', 'js/lib/lucid', 'underscore'], function($, LucidJS, _) {
      return Affixes($, LucidJS, _);
    });
  } else if (typeof window !== 'undefined' && typeof ender === 'undefined') {
     window.Affix = Affixes(window.$, window.LucidJS, window._);
  }

})();
