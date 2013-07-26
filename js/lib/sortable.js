define(["jquery", "underscore", "backbone", "js/lib/drag"],

function($, _, Backbone, Drag) {
  var _private = {
    options: {
      drag: {
        persist: false
      },
      manual: false
    },

    groups: {},
    past: {
      x: 0,
      y: 0
    },
    sorting: null,

    initialize: function(ele, _options) {
      this.$element = $(ele);
      this.id = _.uniqueId();
      this.options = $.extend(true, {}, _private.options, _options);
      var group = this.options.group;

      if (this.options.selector) {
        this.options.drag.selector = this.options.selector;
      } else {
        this.$element.children()
          .addClass("sortable");
        this.options.drag.selector = this.options.selector = ".sortable";
      }

      this.drag = Drag(this.$element, this.options.drag)
        .on("start", _.bind(_private.start, this))
        .on("drag", _.bind(_private.drag, this))
        .on("end", _.bind(_private.dragend, this));

      if (group) {
        if (!_private.groups[group]) {
          _private.groups[group] = {};
        }

        _private.groups[group][this.id] = this;
      }
    },

    start: function(e) {
      this.trigger("start", e, this);
    },

    sort: function(to, dir, item, e) {
      this.sorting = {
        from: this,
        to: to,
        what: item,
        where: dir
      };

      if (!this.is(to)) {
        this.sorting.from.trigger("sorting-out", e, this);
        this.sorting.to.trigger("sorting", e, this);
      } else {
        this.trigger("sorting", e, this);
      }
    },

    drag: function(e) {
      var groups = {};

      if (this.options.group) {
        groups = _private.groups[this.options.group]
      } else {
        groups[this.id] = this;
      }

      for (var id in groups) {
        var $list = groups[id].$element;

        if (this.drag.covering($list) > 0.5) {
          var inlist = $list.find(this.drag.original.$element)
            .size();
          var targets = $list.find(this.options.selector);

          if (targets.size()) {
            for (var j = 0; j < targets.size(); j++) {
              var item = targets.get(j);
              var cover = this.drag.covering(item);
              var dir = e.pageY > _private.past.y ? 'after' : 'before';

              if (cover >= 0.5) {
                if (inlist) {
                  _private.sort.call(this, groups[id], dir, item, e);
                  if (!this.options.manual) this.drag.move(dir, item);
                } else {
                  _private.sort.call(this, groups[id], dir == 'after' ? 'before' : 'after', item, e);
                  if (!this.options.manual) this.drag.move(e.pageY > _private.past.y ? 'before' : 'after', item);
                }

                break;
              }
            }
          } else {
            _private.sort.call(this, groups[id], 'into', $list[0], e);
            if (!this.options.manual) this.drag.move('into', $list);
          }
        }
      }

      _private.past = {
        x: e.pageX,
        y: e.pageY
      };
      this.trigger("drag", e, this);
    },

    dragend: function(e) {

      if (this.sorting) {
        if (!this.sorting.to.is(this.sorting.from)) {
          this.sorting.from.trigger("sorted-out", e, this);
          this.sorting.to.trigger("sorted", e, this);
        } else {
          this.trigger("sorted", e, this);
        }
      }

      this.sorting = null;
      this.trigger("end", e, this);
    },

    destroy: function() {
      var group = this.options.group;

      if (group) {
        delete _private.groups[group][this.id];
      }
    }
  };

  var Sortable = function(ele, _options) {
    _private.initialize.apply(this, [ele, _options]);
  };

  Sortable.prototype.disable = function() {
    _private.destroy.apply(this);
  };

  Sortable.prototype.is = function(sortable) {
    return (sortable instanceof Sortable) && this.id == sortable.id;
  };

  Sortable.prototype.enable = function(options) {
    this.disable();
    _private.initialize.apply(this, [$.extend(true, this.options, _options)]);
    return this;
  };

  _.extend(Sortable.prototype, Backbone.Events);

  _public = function(ele, options) {
    return new Sortable(ele, options);
  };

  _public.Drag = Drag;

  return _public;
});
