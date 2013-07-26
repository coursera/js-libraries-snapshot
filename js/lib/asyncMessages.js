/**
 * This library creates loading messages, used in conjunction with AJAX calls.
 */
define([
  "jquery",
  "underscore",
  "js/lib/cookie",
  "backbone"],
function($, _, cookie, Backbone) {
  var _private = {
    defaults: {
      selector: null
    },

    defaults_item: {
      timeout: 0
    },

    item_remove: function(item) {
      var index = _.indexOf(this.stack, item.options.id);

      if (index != -1) {
        this.stack.splice(index, 1);

        for (var _event in item.options.events) {
          item.$ele.off(_event + ".asyncMessage");
        }

        item.$ele.remove();
      }

      delete this.items[item.options.id];
    },

    item_show: function(item) {
      var that = this;

      if (this.stack.length) {
        var previous = this.items[this.stack[0]];

        if (previous) {
          previous.$ele.remove();
        }
      }

      this.$container.append(item.$ele);
      this.trigger("showing", item.$ele);
      this.$container.show();
      this.stack.unshift(item.options.id);
      this.trigger("show", item);

      if (item.options.timeout) {
        setTimeout(function() {
          that.trigger("hiding", item);
          that.remove(item.options.id);
          that.trigger("hide", item);
        }, item.options.timeout);
      }

      for (var _event in item.options.events) {
        item.$ele.on(_event + ".asyncMessage", function(e) {
          item.options.events[_event].call(that, e, item);
        });
      }
    }
  };

  var asyncMessage = function(ele, options) {
    this.options = $.extend({}, _private.defaults, options);
    this.$ele = $(ele || $("<div>")
      .appendTo("body"));
    this.$container = this.options.selector ? this.$ele.find(this.options.selector) : this.$ele;
    this.stack = [];
    this.items = {};
  };

  asyncMessage.prototype.add = function(ele, _options) {
    var $item = $(ele);
    var options = $.extend({}, _private.defaults_item, _options);
    var that = this;

    options.id = options.id || _.uniqueId();
    if(_.has(this.items, options.id)) {
      return options.id;
    }
    this.items[options.id] = {
      $ele: $item,
      options: options,
      timer: null
    };

    var show = function() {
      if (!that.stack.length) {
        that.trigger("opening");
      }

      _private.item_show.call(that, that.items[options.id]);

      if (that.stack.length == 1) {
        that.trigger("open");
      }
    };

    if (options.delay) {
      this.items[options.id].timer = setTimeout(show, options.delay);
    } else {
      show();
    }

    return options.id;
  };

  asyncMessage.prototype.remove = function(id) {
    var item = this.items[id];

    if (item) {
      clearTimeout(item.timer);

      if (this.stack.length == 1) {
        this.trigger("closing");
        _private.item_remove.call(this, item);
        this.$container.hide();
        this.trigger("close");
      } else {
        if (this.stack.length) {
          var toShow = this.items[this.stack.shift()];
          if(toShow)
            _private.item_show.call(this, toShow);
        }

        _private.item_remove.call(this, item);
      }
    }
  };

  _.extend(asyncMessage.prototype, Backbone.Events);

  return {
    create: function(ele, options) {
      return new asyncMessage(ele, options);
    }
  };
});
