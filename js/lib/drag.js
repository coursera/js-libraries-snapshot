define(["jquery", "underscore", "backbone"],
function($, _, Backbone) {

  var touch = (('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch);

  var _private = {
    defaults: {
      'type': 'custom', // accepts 'clone', 'permanent' and 'custom'
      'limit.type': 'none',
      'limit.x': null,
      'limit.y': null,
      'offset.x': 0,
      'offset.y': 0,
      'prevent': true,
      'container': null,
      'style.dragged': 'dragged',
      'style.dragging': 'dragging',
      'style.draggable': 'draggable',
      'style.targeting': 'targeting',
      'attribute.drag': 'data-drag',
      'attribute.handle': 'data-drag-handle',
      'bind.start': touch ? 'touchstart' : 'mousedown',
      'bind.drag': touch ? 'touchmove' : 'mousemove',
      'bind.drop': touch ? 'touchend' : 'mouseup',
      'bind.over': 'mouseover',
      'bind.out': 'mouseout'
    },
    
    default_state: {
      dragging: false,
      timer: null,
      'last.x': 0,
      'last.y': 0,
      target: null
    },

    targets: [],

    delegates: {
      global: {},
      selector: {}
    },

    zIndex: 100000,

    initialize: function(ele, options) {
      this.$element = $(ele);

      this.threshold = {};
      this.targets = [];
      this.state = _.extend({}, _private.default_state);
      this.customize(options);
      this.$container = this.options.container ? $(this.options.container) : null;

      // if this data-drag exists, user wants this to be delegated
      if (this.$element.attr(this.options['attribute.drag']) === undefined) 
        this.$element.on(this.options['bind.start'] + '.drag', _.bind(_private.start, this));
    },

    start: function(e) {
      this.event = e;
      var that = this;

      if (e.which == 1 && !this.state.dragging) {
        var target = $(e.target);
        var handle = this.$element.attr(this.options['attribute.handle']);
        this.state = _.extend({}, _private.default_state);

        // target must be inside element
        if (handle === undefined || (handle && target.closest(handle).size())) {
          if(touch)
            this.start(e.currentTarget, e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY);
          else
            this.start(e.currentTarget, e.pageX, e.pageY);

          if (this.options.prevent) e.preventDefault();
        }
      }
    },

    dragStart: function(x, y) {
      var that = this;
      this.original.width = this.original.$element.outerWidth();
      this.original.height = this.original.$element.outerHeight();

      // if drag object is not persisting, we create it each time
      if (this.options.type != 'permanent') {
        if (this.options.type == 'clone') {
          this.draggable.$element = this.original.$element.clone();
          this.draggable.$element.width(this.original.$element.width());
          this.draggable.$element.height(this.original.$element.height());
          this.original.x = x;
          this.original.y = y;
        } else {
          this.draggable.$element = $('<div>').addClass(this.options['style.draggable']);
        }

        this.draggable.$element.css({position:'absolute', 'float':'none'}).hide();

        if (this.original.isAbsolute || this.options.type == 'custom') {
          this.original.x = 0;
          this.original.y = 0;
          $('body').append(this.draggable.$element);
        } else {
          this.draggable.$parent.insertBefore(this.original.$element);
          this.draggable.$parent.append(this.draggable.$element);
        }
      } else {
        this.draggable.$element = this.original.$element;

        if (!this.original.isAbsolute) {
          this.draggable.$parent.insertBefore(this.draggable.$element);
          this.draggable.$parent.append(this.draggable.$element);
          this.draggable.$element.css({position:'absolute'});
        }

        this.original.x = x - _private.cssToInt(this.draggable.$element.css('left'));
        this.original.y = y - _private.cssToInt(this.draggable.$element.css('top'));
      }

      this.draggable.$element.css({
        'z-index': _private.zIndex++
      });

      this.state.dragging = true;
      this.state.group = this.original.$element.attr('data-drag');

      _private.trigger.call(this, 'start', this);
      this.trigger('start', this);
      _private.position.call(this, x, y);
      _private.style.call(this);
    },

    scroll: function(e) {
      var win = $(window);
      var doc = $(document);
      var container = this.options.container;
      var move = {
        left: 0,
        top: 0
      };
      var boundary = _private.getBounds(this.draggable.$element);

      clearTimeout(this.state.timer);

      if (doc.outerHeight() > win.height() || (container && container.scrollHeight)) {
        win = container || win;

        // do we need to scroll up/down
        if (boundary.y2 > win.outerHeight() + win.scrollTop()) move.top = boundary.y2 - (win.outerHeight() + win.scrollTop());
        else if (win.scrollTop() > 0 && boundary.y1 < win.scrollTop()) move.top = boundary.y1 - win.scrollTop();

        // do we need to scroll up/down
        if (boundary.x2 > win.width() + win.scrollLeft()) move.left = (win.width() + win.scrollLeft()) - boundary.x2;
        else if (win.scrollLeft() > 0 && boundary.x1 < win.scrollLeft()) move.left = boundary.x1 - win.scrollLeft();

        if ((move.left || move.top) && this.state.dragging) {
          this.state.timer = setTimeout(_.bind(_private.scrollIt, this, win, move.left, move.top), 0);
        }
      }
    },

    getBounds: function(ele) {
      var $element = $(ele).eq(0);
      var offset = $element.offset();

      var boundary = {
        x1: offset.left,
        x2: offset.left + $element.outerWidth(),
        y1: offset.top,
        y2: offset.top + $element.outerHeight()
      };

      return boundary;
    },

    scrollIt: function(container, left, top) {
      clearTimeout(this.state.timer);

      if (this.state.dragging) {
        if (left) {
          container.scrollLeft(container.scrollLeft() + (left > 0 ? 1 : -1));
          left = left > 0 ? left - 1 : left + 1;
        }

        if (top) {
          container.scrollTop(container.scrollTop() + (top > 0 ? 1 : -1));
          top = top > 0 ? top - 1 : top + 1;
        }

        if (left !== 0 || top !== 0) {
          this.state.timer = setTimeout(_.bind(_private.scrollIt, this, container, left, top), 0);
        }
      }
    },

    threshold: function(x, y) {
      var t = this.threshold;
      return (t.pass) ? true : (Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2)) > t.max);
    },

    cssToInt: function(_value) {
      var value = parseInt(_value, 10);
      return isNaN(value) ? 0 : value;
    },

    position: function(x, y) {
      var t = this.options,
        o = this.original;

      if (t['limit.type'] == 'border') {
        x = (x < t['limit.x'][0]) ? t['limit.x'][0] : (x + o.width > t['limit.x'][1]) ? t['limit.x'][1] - o.width : x;
        y = (y < t['limit.y'][0]) ? t['limit.y'][0] : (y + o.height > t['limit.y'][1]) ? t['limit.y'][1] - o.height : y;
      } else if (t['limit.type'] == 'vertical') {
        x = o.x;
        y = (_.isArray(t['limit.y'])) ? (y < t['limit.y'][0]) ? t['limit.y'][0] : (y > t['limit.y'][1]) ? t['limit.y'][1] : y : y;
      } else if (t['limit.type'] == 'horizontal') {
        y = o.y;
        x = (_.isArray(t['limit.x'])) ? (x < t['limit.x'][0]) ? t['limit.x'][0] : (x > t['limit.x'][1]) ? t['limit.x'][1] : x : x;
      }

      if (t['offset.x']) x = x + parseInt(t['offset.x'], 10);

      if (t['offset.y']) y = y + parseInt(t['offset.y'], 10);

      // reposition drag element
      this.draggable.$element.css({
        left: x - o.x,
        top: y - o.y
      });
    },

    targeting: function(e) {
      var x = this.state['last.x'] = touch ? e.originalEvent.touches[0].clientX : e.pageX;
      var y = this.state['last.y'] = touch ? e.originalEvent.touches[0].clientY : e.pageY;

      this.draggable.$element.css({display:"none"});
      var target = document.elementFromPoint(
        x - document.documentElement.scrollLeft - document.body.scrollLeft,
        y - document.documentElement.scrollTop - document.body.scrollTop
      );
      this.draggable.$element.css({display:""});

      var targetSelector = '[data-drag-target~=' + this.state.group + ']';
      var $target = $(target);

      if($target.is(targetSelector) || $target.parents(targetSelector).size())
      {
        if(!$target.is(targetSelector)) {
          target = $target.parents(targetSelector)[0];
          $target = $(target);
        }

        // found a new target from previously?
        if(this.state.target != target) {
          var dropTarget = _.find(_private.targets, function(_target) {
            return $target.is(_target.selector) || $target.parents(_target.selector).size();
          });

          if(this.state.target) {
            _private.trigger.call(this, 'targetout', this);
            this.trigger('targetout', this);
            $(this.state.target).removeClass(this.options['style.targeting']);

            if(this.state.dropTarget)
              this.state.dropTarget.trigger('out', this);
          }

          this.state.target = target;
          _private.trigger.call(this, 'targetin', this);
          this.trigger('targetin', this);

          $target.addClass(this.options['style.targeting']);

          this.state.dropTarget = dropTarget;

          if(dropTarget) 
            dropTarget.trigger('in', this);
        }

        if(e.type == this.options['bind.drag']) {
          _private.trigger.call(this, 'targetdrag', this);
          this.trigger('targetdrag', this);

          if(this.state.dropTarget)
            this.state.dropTarget.trigger('drag', this);
        } else {
          _private.trigger.call(this, 'targetdrop', this);
          this.trigger('targetdrop', this);
          $(this.state.target).removeClass(this.options['style.targeting']);
          if(this.state.dropTarget)
            this.state.dropTarget.trigger('drop', this);
        }
      } else if(this.state.target) {
        _private.trigger.call(this, 'targetout', this);
        this.trigger('targetout', this);
        $(this.state.target).removeClass(this.options['style.targeting']);
        if(this.state.dropTarget)
          this.state.dropTarget.trigger('out', this);
        this.state.target = null;
        this.state.dropTarget = null;
      }
    },

    drag: function(e) {
      this.event = e;

      var that = this;
      var x = this.state['last.x'] = touch ? e.originalEvent.touches[0].clientX : e.pageX;
      var y = this.state['last.y'] = touch ? e.originalEvent.touches[0].clientY : e.pageY;

      if ((this.threshold.pass = _private.threshold.apply(this, [x, y]))) {
        e.preventDefault();

        if (!this.state.dragging) {
          _private.dragStart.call(this, x, y);
        }

        _private.position.call(this, x, y);
        _private.scroll.call(this);
        _private.trigger.call(this, 'drag', this);
        that.trigger('drag', this);

        // look to see if we are acting on drop targets
        _private.targeting.call(this, e);
      }
    },

    drop: function(e) {
      this.event = e;

      // remove listeners since we are done
      $(document).off(this.options['bind.drag'] + '.drag');
      $(document).off(this.options['bind.drop'] + '.drag');

      if(this.state.dragging) {
        // look to see if we are acting on drop targets
        _private.targeting.call(this, e);
      }

      // if we are not persisting, then drag object should be removed from the DOM
      if (this.options.type != 'permanent' && this.state.dragging) {
        this.draggable.$element.remove();

        if (!this.original.isAbsolute && this.options.type == 'clone') {
          this.draggable.$parent.remove();
        }
      }

      this.state.dragging = false;

      // turn off drag style
      _private.style.call(this);

      // run callback
      _private.trigger.call(this, 'end', this);
      this.trigger('end', this);
    },

    style: function() {
      if (this.draggable.$element) {
        var x, z;

        if (this.options.type != 'permanent') {
          if (this.state.dragging) this.original.$element.addClass(this.options['style.dragged']);
          else this.original.$element.removeClass(this.options['style.dragged']);

          this.draggable.$element.css({
            display: this.state.dragging ? 'block' : 'none'
          });
        }

        if (this.state.dragging) {
          this.draggable.$element.addClass(this.options['style.dragging']);
          $('body')
            .addClass(this.options['style.dragging']);
        } else {
          this.draggable.$element.removeClass(this.options['style.dragging']);
          $('body')
            .removeClass(this.options['style.dragging']);
        }
      }
    },

    getDrag: function(el, options) {
      var drag = $(el)
        .data("drag.me");

      if (drag && drag.constructor == Drag.prototype.constructor) {
        if (options) drag.customize(options);
        return drag;
      } else {
        return null;
      }
    },

    makeDrag: function(el, settings) {
      var $el = $(el);
      var drag = _private.getDrag($el, settings);

      // if popup hasn't been created, make one!
      if (!drag) {
        drag = new Drag($el, settings);
        $el.data("drag.me", drag);
      } else if (settings) {
        drag.customize(settings);
      }

      return drag;
    },

    readDataAttributes: function($anchor, prefix, defaults) {
      var settings = {};

      for (var key in defaults) {
        var attr = $anchor.attr(prefix + key.replace(/\./g, '-'))
        settings[key] = attr === undefined ? defaults[key] : attr;
      }

      return settings;
    },

    trigger: function() {
      var type = Array.prototype.shift.call(arguments);
      _.each(_private.delegates[type], function(delegate) {
        var match = delegate.selector ? this.$element.is(delegate.selector) : true;
        if (match) delegate.callback.call(this, arguments);
      });
    }
  };

  var Drag = function(ele, _options) {
    _private.initialize.call(this, ele, _options);
    return this;
  };

  Drag.prototype.enable = function(_options) {
    this.disable();
    _private.initialize.call(this, this.$element, _options);
    return this;
  };

  Drag.prototype.customize = function(settings) {
    if (!this.options || settings) this.options = _.extend({}, _private.readDataAttributes(this.$element, 'data-drag-', _private.defaults), settings);
    return this;
  };

  Drag.prototype.disable = function() {
    this.$element.off(this.options['bind.start'] + '.drag');
    _.each(this.targets, function(target) {
      target.disable();
    });
    return this;
  };

  Drag.prototype.start = function(target, x, y) {
    var $ele = $(target).eq(0);

    this.original = {
      $element: $ele,
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      isAbsolute: $ele.css('position') != 'static'
    };

    this.draggable = {
      $element: null,
      $parent: $('<div>').css({position:'relative'})
    };

    // floated element parents need to retain width and float styles
    if(this.original.$element.css('float')) {
      this.draggable.$parent.css({
        'float':this.original.$element.css('float'),
        'width':this.original.$element.outerWidth()
      });
    }

    $(document).on(this.options['bind.drag'] + ".drag", _.bind(_private.drag, this));
    $(document).on(this.options['bind.drop'] + ".drag", _.bind(_private.drop, this));

    // capture any droppables
    this.threshold = {
      x: x,
      y: y,
      pass: false,
      max: 5
    };

    return this;
  };

  Drag.prototype.move = function(around, what) {
    var offset = this.original.$element.offset();

    if (around == 'before') {
      this.original.$element.insertBefore(what);
    } else if (around == 'after') {
      this.original.$element.insertAfter(what);
    } else if (around == 'into') {
      this.original.$element.appendTo(what);
    }

    if (!this.original.isAbsolute) {
      if (this.state.dragging) {
        var offset2 = this.original.$element.offset();

        this.original.x -= (offset.left - offset2.left);
        this.original.y -= (offset.top - offset2.top);

        _private.position.apply(this, [this.state['last.x'], this.state['last.y']]);
      }
    }
  };

  _.extend(Drag.prototype, Backbone.Events);

  var DragTarget = function(selector) {
    this.selector = selector;
    this.enable();
  };

  DragTarget.prototype.disable = function() {
    var that = this;
    _private.targets = _.reject(_private.targets, function(target) {
      return target.selector == that.selector;
    });
  };

  DragTarget.prototype.enable = function() {
    _private.targets.push(this);
  };

  _.extend(DragTarget.prototype, Backbone.Events);

  var external = function() {
    return _private.getDrag.apply(null, arguments) || _private.makeDrag.apply(this, arguments);
  };

  external.delegate = function(view, _options) {
    var options = _.extend({}, _private.defaults, _options);
    var $view = $(view);
    $view.on(options['bind.start'] + ".drag", "[" + options['attribute.drag'] + "]", function(e) {
      var $drag = $(e.currentTarget);
      if ($drag.attr('disabled') != 'disabled') {
        var drag = _private.makeDrag($drag);
        _private.start.call(drag, e);
      }
    });
  };

  external.undelegate = function(view, _options) {
    var options = _.extend({}, _private.defaults, _options);
    var $view = $(view);
    $view.off('.drag');
    $view.find('[' + options['attribute.drag'] + ']')
      .each(function(_drag) {
      var drag = _private.getDrag(_drag);
      if (drag) {
        drag.disable();
      }
    });
  };

  external.on = function(_type, selector, callback) {
    var tags = _type.split('.');
    var type = tags.shift();

    if (!_private.delegates[type]) _private.delegates[type] = [];

    if (_.isString(selector)) _private.delegates[type].push({
      selector: selector,
      tags: tags,
      callback: callback
    });
    else if (_.isFunction(selector)) _private.delegates[type].push({
      tags: tags,
      callback: selector
    });
  };

  external.off = function(_type, selector, callback) {
    var tags = _type.split('.');
    var type = tags.shift();
    var matches;

    if (type) {
      _private.delegates[type] = _.reject(_private.delegates[type], function(one) {
        matches = (selector ? one.selector == selector : true) && (tags.length ? _.difference(one.tags, tags)
          .length === 0 : true) && (callback ? one.callback == callback : true);
      });
    } else {
      _.each(_private.delegates, function(delegate, type) {
        _private.delegates[type] = _.reject(_private.delegates[type], function(one) {
          matches = (selector ? one.selector == selector : true) && (tags.length ? _.difference(one.tags, tags)
            .length === 0 : true) && (callback ? one.callback == callback : true);
        });
      });
    }
  };

  external.Target = function(selector) {
    return new DragTarget(selector);
  };

  // kick it off!
  external.delegate('body');

  return external;
});
