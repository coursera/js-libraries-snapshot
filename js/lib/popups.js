/** 

Please follow the recommended usage for optimal accessibility.

An example anchor, with proper ARIA attributes and explanation:

<li class="course-topbar-nav-list-item"
    tabindex="0" role="button" aria-haspopup="true" aria-expanded="false" aria-owns="course-topbar-aboutus"
    data-popup="#course-topbar-aboutus" data-popup-bind-open="mouseenter" data-popup-direction="se" data-popup-close style="cursor:pointer;">
    <a>About <i class="icon-caret-down"></i></a>
</li>

• The link will appear as a menu button to a screen reader due to the button role and
the aria-haspopup attribute, and the screen readers will announce that the menu can be
expanded by pressing the space bar.
• The expanded state of the dropdown is conveyed to the screen reader through
the aria-expanded attribute. The value of this attribute is dynamically set
to "true" or "false" depending on whether the dropdown is currently expanded or
collapsed. You should set it to false in the HTML to begin with.
• The aria-owns attribute is used to create a relationship between the link and the
dropdown list. The value should be the ID attribute of the dropdown's popup.

Its associated popup:

<div id="course-topbar-aboutus" class="course-topbar-sublist">
    <a class="course-topbar-sublist-item" href="https://www.coursera.org/about/jobs" target="_new">Jobs</a>
    <a class="course-topbar-sublist-item" href="https://www.coursera.org/about/team" target="_new">Team</a>
    <a class="course-topbar-sublist-item" href="https://www.coursera.org/about/contact" target="_new">Contact Us</a>
    <a class="course-topbar-sublist-item" href="https://www.coursera.org/about/" target="_new">About Us</a>
</div>
*/   

(function(wndw) {
  var popup = function($, _, Backbone) {

    var UP_ARROW    = 38;
    var DOWN_ARROW  = 40;
    var SPACE_BAR   = 32;
    var ESCAPE      = 27;
    var OPENED      = 1;
    var CLOSED      = 0;

    var _private = {
      defaults: {
        'bind.open': 'click',
        'bind.close': 'click',
        'bind.cancel.document': 'mousemove',
        'bind.cancel.popup': 'mouseleave',
        'bind.uncancel.popup': 'mouseenter',
        'bind.keydown': 'keydown',
        'direction': 'sw',
        'offset.x': 0,
        'offset.y': 0,
        'timeout': 450,
        'timeout.intent': 350,
        'resize': false, // if true, matches popup to anchor width
        'width': false, // if truthy, set the popup's css width to this
        'attribute.open': 'data-popup',
        'attribute.close': 'data-popup-close',
        'attribute.item': 'data-popup-item',
        'position': 'absolute'
      },

      prevPopup: null,
      prevTimeout: null,
      timeout: null,
      timeoutClear: null,
  
      getPopup: function(el, options) {
        var pop = $(el).data("popup.me");
  
        if (pop && pop.constructor == Popup.prototype.constructor) {
          if (options) return pop.customize(options);
          else return pop;
        } else {
          return null;
        }
      },

      getPopupForAnchor: function($anchor, _options) {
        var selector = $anchor.attr(_private.defaults['attribute.open']);
        var $pop = $(selector);
  
        var options = _private.readDataAttributes($anchor, 'data-popup-', _.extend({}, _private.defaults, _options));
        var pop = _private.makePopup($pop, options);
        return pop;
      },

      closeOlderPopups: function() {
        if(_private.prevPopup) {
          _private.prevPopup.close();
          _private.prevPopup = null;
        }
      },
  
      isTouch: (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch),
  
      makePopup: function(el, settings) {
        var $el = $(el);
        var pop;

        if ($el.attr('data-popup')) {
          pop = _private.getPopupForAnchor($el);
        } else {
          pop = _private.getPopup($el);
        }

        // $el should be the popup
        if (!pop) {
          pop = new Popup($el, settings);
          $el.data("popup.me", pop);
        }
      
        return pop;
      },
  
      monitorKeys: function(e) {
        if (_.contains([UP_ARROW, DOWN_ARROW], e.keyCode)) {
          e.preventDefault();
          e.stopPropagation();
          _private.changeFocus.call(this, e);
        }
        if (e.keyCode == ESCAPE) {
          // Return focus to the original link, required for accessibility
          this.$anchor.focus();
          this.close();
        }
      },
  
      monitorActions: function(e) {
        var el = this.$el[0];
        var $target = $(e.target);
        var that = this;

        if(e.type != 'mouseleave') {
          if($target.closest(this.$el).size() > 0 || $target.closest(this.$anchor).size() > 0) {
            window.clearTimeout(_private.timeout);
            return;
          }
        } else {
          _private.timeout = window.setTimeout(function() {
            if(that.state == OPENED)
              that.close();
          }, this.options.timeout);
        }
      },

      readDataAttributes: function($anchor, prefix, defaults) {
        var settings = {};
  
        for (var key in defaults) {
          var attr = $anchor.attr(prefix + key.replace(/\./g, '-'));
          settings[key] = attr === undefined ? defaults[key] : attr;
        }
        return settings;
      },

      // when opening popups on hover, we want to ensure the
      // user has the intent to open the menu, rather than just mousing over to something else
      // we determine this if the user's mouse can still be found on the anchor at 'timeout.intent' milleseconds later
      intentOpen: function(e, popup, $anchor) {
        var anchor = $anchor[0];
        var x = e.pageX;
        var y = e.pageY;

        // if a previous intent was registered, cancel it, because a new intent is needed
        if(_private.prevTimeout) {
          $(document).off(".popup");
          window.clearTimeout(_private.prevTimeout);
        }

        // checkback in 'timeout.intent' milleseconds later. if this timeout hasn't been cancelled,
        // open the popup if it isn't already open
        _private.prevTimeout = window.setTimeout(function() {
          window.clearTimeout(_private.prevTimeout);
          $(document).off(".popup");

          if(!popup.isOpen()) {
            popup.open($anchor);
          }
        }, popup.options['timeout.intent']);

        // if mousemove or mouseleave is detected, check to see if we have left the $anchor
        $(document).on("mousemove.popup mouseleave.popup", function(e) {
          // if mouse leaves document or moves not on popup, intent is called off
          if(e.type == "mouseleave" || (e.target != anchor && $(e.target).closest(anchor).size() === 0)) {
            // if we have left the $anchor, cancel the intent
            $(document).off(".popup");
            window.clearTimeout(_private.prevTimeout);
          } 
        });
      },
  
      changeFocus: function(e) {
        if (!this.$anchor) return;
        var item_selector = this.$anchor.attr(this.options['attribute.item']); // optional item filter
        var $items = this.$el.children(':visible'); // filter by visible items
  
        if(item_selector) // if filter provided, do it, else, visible children will do
          $items = $items.filter(item_selector);

        if (!$items.length) return;
  
        index = $items.index($items.filter(':focus'));

        if (e.keyCode == UP_ARROW) 
          index--; // up
  
        if (e.keyCode == DOWN_ARROW) 
          index++; // down
  
        if(index < 0 || index >= $items.length) 
          this.$anchor.focus();
        else if(index < $items.length)
          $items.eq(index).focus();
      }
    };
  
    var Popup = function(el, settings) {
      this.$el = $(el);
      this.$parent = this.$el.parent();
      this.$anchor = null;
      this.customize(settings);
    };
  
    Popup.prototype.customize = function(settings) {
      this.options = _.extend({}, _private.defaults, settings);

      this.options['offset.x'] = parseInt(this.options['offset.x'], 10);
      this.options['offset.y'] = parseInt(this.options['offset.y'], 10);

      return this;
    };
  
    Popup.prototype.get = function() {
      return this.$el;
    };
  
    Popup.prototype.open = function(anchor) {
      var that = this;
      var $anchor = $(anchor);

      if (!this.$anchor || this.$anchor[0] != $anchor[0]) {
        var position = $anchor.position();
  
        // append it to the parent of the anchor for proper positioning
        this.$anchor = $anchor;
        this.$anchor.parent().append(this.$el);
        this.$anchor.attr('aria-expanded', 'true');
        if (that.options.resize) this.$el.width(this.$anchor.outerWidth());
        if (that.options.width) this.$el.css('width', that.options.width);

        this.trigger("opening", this.$anchor);

        if (!this.options.direction || this.options.direction == "sw") {
          this.move(position.left + this.options['offset.x'], position.top + $anchor.outerHeight() + this.options['offset.y']);
        } else if (this.options.direction == "se") {
          this.move(
            position.left + $anchor.outerWidth() + this.options['offset.x'] - this.$el.outerWidth(),
            position.top + $anchor.outerHeight() + this.options['offset.y']);
        } else if (this.options.direction == 'ne') {
          this.move(
            position.left + $anchor.outerWidth() + this.options['offset.x'] - this.$el.outerWidth(),
            position.top - this.$el.outerHeight()  - this.options['offset.y']);
        } else if (this.options.direction == 's') {
          this.move(
            position.left + $anchor.outerWidth()/2 + this.options['offset.x'] - this.$el.outerWidth()/2,
            position.top + $anchor.outerHeight() + this.options['offset.y']);
        } else if (this.options.direction == 'n') {
          this.move(
            position.left + $anchor.outerWidth()/2 + this.options['offset.x'] - this.$el.outerWidth()/2,
            position.top - this.$el.outerHeight() + this.options['offset.y']);
        } else if (this.options.direction == 'w') {
          this.move(position.left + this.options['offset.x'] - this.$el.outerWidth(), position.top + this.options['offset.y']);
        }
  
        this.$el.show();
 
        window.setTimeout(function() {
          _private.closeOlderPopups();
          $anchor.addClass('popup-opened').focus();
          that.trigger("opened", that.$anchor);
          that.state = OPENED;
          _private.prevPopup = that;

          // mouse could move off the document, so these events help catch those edge cases 
          // such as when a popup is ontop of an iframe
          that.$el.on(that.options['bind.cancel.popup'] + '.popup', _.bind(_private.monitorActions, that));
          that.$anchor.on(that.options['bind.cancel.popup'] + '.popup', _.bind(_private.monitorActions, that));
          that.$el.on(that.options['bind.uncancel.popup'] + '.popup', _.bind(_private.monitorActions, that));
          that.$anchor.on(that.options['bind.uncancel.popup'] + '.popup', _.bind(_private.monitorActions, that));

          $(document)
            .on(that.options['bind.cancel.document'] + '.popup', _.bind(_private.monitorActions, that))
            .on(that.options['bind.keydown'] + '.popup', _.bind(_private.monitorKeys, that));
  
          if (that.options['attribute.close']) {
            that.$el.on(that.options['bind.close'] + '.popup', '[' + that.options['attribute.close'] + ']', function(e) {
              if ($(e.currentTarget)
                .attr('disabled') != 'disabled') {
                that.close();
              }
            });
          }
        }, 0);
      }
      return this;
    };
  
    Popup.prototype.move = function(x, y, z) {
      this.$el.css({
        left: x,
        top: y,
        "z-index": z || 10000,
        position: this.options.position
      });
      return this;
    };
  
    Popup.prototype.close = function() {
      $(document).off(".popup");

      this.$anchor.attr('aria-expanded', 'false');
      this.$anchor.removeClass('popup-opened');
      this.trigger("closing", this.$anchor);
      this.$el.off(".popup").hide();
      this.$anchor.off(".popup");
      this.$parent.append(this.$el);
      this.trigger("closed", this.$anchor);
      this.$anchor = null;
      this.state = CLOSED;
      window.clearTimeout(this.timeout);
      _private.prevPopup = null;
      return this;
    };
  
    Popup.prototype.isOpen = function() {
      return this.$el.is(':visible');
    };
  
    _.extend(Popup.prototype, Backbone.Events);
  
    var external = function() {
      return _private.getPopup.apply(null, arguments) || _private.makePopup.apply(this, arguments);
    };
  
    external.start = function(view, _options) {
      var $view = $(view);
      var options = _.extend({}, _private.defaults, _options);
  
      function openPopup(pop, $anchor) {
        if(!pop.isOpen()) {
          pop.open($anchor);
        }
      }
  
      // TODO handle touch events since click has a 300ms delay
      $view.on("click.popup mouseenter.popup keydown.popup", "[" + options['attribute.open'] + "]", function(e) {
        var $anchor = $(this);
        var bind = $anchor.attr("data-popup-bind-open");
  
        if ($anchor.attr('disabled') == 'disabled') return;
  
        var pop = _private.getPopupForAnchor($anchor, _options);

        // Screen readers expect for a menu to be openable via the space bar
        // Other users might expect to use the up/down arrows
        if (e.type == 'keydown' && _.contains([UP_ARROW, DOWN_ARROW, SPACE_BAR], e.keyCode)) {
          e.preventDefault();
          e.stopPropagation();
          if (e.keyCode == DOWN_ARROW || e.keyCode == SPACE_BAR) {
            if(!pop.isOpen()) {
              openPopup(pop, $anchor);
            }
            _private.changeFocus.call(pop, e);
          } else if(e.keyCode == UP_ARROW && pop.isOpen()) {
            pop.close();
          }
        }
  
        // if e.type is not click but we are a touchDevice, just force it, since mouseover will never happen
        if (e.type == bind || (!bind && e.type == 'click') || (_private.isTouch && e.type == "click")) {
          if(e.type == 'mouseover' || e.type == 'mouseenter') {
            _private.intentOpen(e, pop, $anchor);
          } else {
            openPopup(pop, $anchor);
          }
        }
      });
    };
  
    external.stop = function(view) {
      var $view = $(view);
      $view.off(".popup");
      _private.closeOlderPopups();
    };
  
    // kick it off!
    external.start('body');
  
    return external;
  };

  if(typeof define === "function" && define.amd) {
    define(["jquery", "underscore", "backbone"], function($, _, Backbone) { 
      return popup($, _, Backbone);
    });
  } else {
    wndw.Popup = popup(wndw.$, wndw._, wndw.Backbone);
  }

})(window);
