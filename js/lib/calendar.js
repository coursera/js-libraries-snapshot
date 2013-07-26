define([
  "jquery",
  "underscore",
  "backbone"
  ],

function($, _, Backbone) {
  var text = {
    days: {
      abbreviation: ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"],
      full: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    },

    months: {
      abbreviation: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    }
  };

  var _private = {
    make: function() {
      var $table = $('<table>');
      var $tbody = $('<tbody>');
      var $tr = $('<tr>');
      var $td = $('<td>');
      var $week = $tr.clone()
        .addClass('week');
      var $title = $tr.clone()
        .addClass('title');
      var that = this;

      $table.css({
        'border-collapse': 'collapse',
        width: '100%'
      });

      this.$calendar.append($table.append($tbody)
        .append($title));
      this.$calendar.on(this.options['bind.select'], _.bind(_private.select, this));
      this.$calendar.on(this.options['bind.hover'], _.bind(_private.hover, this));

      $title.append($td.clone()
        .addClass("prevMonth")
        .html("&laquo;"));
      $title.append($td.clone()
        .attr({
        colSpan: 5
      })
        .addClass("monthyear")
        .append($("<span>")
        .addClass("month"))
        .append($("<span>")
        .addClass("year")));
      $title.append($td.clone()
        .addClass("nextMonth")
        .html("&raquo;"));
      $tbody.append($week);

      for (i = 0; i < 7; i++) {
        var week = $td.clone()
          .addClass('weekday');
        $week.append(week);

        if (this.options.start + i < 7) week.text(this.options['text.days'][i + this.options.start]);
        else week.text(this.options['text.months'][this.options.start + i - 7]);
      }

      for (var j = 0; j < 5; j++) {
        var week2 = $tr.clone();
        $tbody.append(week2);

        for (i = 0; i < 7; i++) {
          week2.append($td.clone()
            .addClass("day"));
        }
      }
    },

    hover: function(e) {
      var $target = $(e.target);
      var $parents = $target.parents();

      if ($target.hasClass('day') || $parents.hasClass('day')) {
        this.trigger('hover', e, this);
      }
    },

    select: function(e) {
      var $target = $(e.target);
      var $parents = $target.parents();

      if ($target.hasClass('nextMonth') || $parents.hasClass('nextMonth')) {
        this.today.setMonth(this.today.getMonth() + 1);
        this.set(this.today);
        this.trigger('change', e, this);
      } else if ($target.hasClass('prevMonth') || $parents.hasClass('prevMonth')) {
        this.today.setMonth(this.today.getMonth() - 1);
        this.set(this.today);
        this.trigger('change', e, this);
      } else if ($target.hasClass('day') || $parents.hasClass('day')) {
        this.trigger('select', e, this);
      }
    },

    makeDay: function(day, date) {
      var div = $("<span>")
        .addClass("number");
      var month = date.getMonth();
      var year = date.getFullYear();

      day.empty()
        .append(div.text((date.getDate()) + ""))
        .data({
        "calendar-date": date
      });
      day.removeClass("next")
        .removeClass("prev")
        .removeClass("today");

      if (this.today.getMonth() != month) day.addClass((this.today.getMonth() > month ? 'next' : 'prev'));

      if (date.getDate() == this.today.getDate() && month == this.today.getDate()) day.addClass("today");
    }
  };

  var Calendar = function(ele, _options) {
    var default_options = {
      'start': 0,
      'text.months': text.months.abbreviation,
      'text.days': text.days.abbreviation,
      'bind.select': 'click',
      'bind.hover': 'mouseover'
    };

    this.options = _.extend({}, default_options, _options);
    this.$calendar = $(ele);

    _private.make.apply(this);
    this.set();
  };

  Calendar.prototype.set = function(_today) {
    var today = _today && _.isDate(_today) ? _today : new Date();
    var month = today.getMonth();
    var date = today.getDate();
    var year = today.getFullYear();
    var $days = this.$calendar.find(".day");

    this.today = new Date(today);

    today.setDate(1);

    this.$calendar.find(".month")
      .empty()
      .html(this.options['text.months'][month] + "&nbsp;");
    this.$calendar.find(".year")
      .empty()
      .text(year);

    while (true) {
      if (today.getDay() != this.options.start) today.setDate(today.getDate() - 1);
      else break;
    }

    for (var i = 0; i < $days.size(); i++) {
      _private.makeDay.apply(this, [$days.eq(i), today]);
      today.setDate(today.getDate() + 1);
    }

    return this;
  };

  Calendar.prototype.today = function() {
    return this.today;
  };

  Calendar.prototype.getDateFromElement = function(el) {
    return $(el)
      .parents(".day")
      .data("calendar-date");
  };

  Calendar.prototype.getElementFromDate = function(date) {
    var days = this.$calendar.find(".day");

    for (var i = 0; i < days.size(); i++) {
      var date2 = days.get(i)
        .data("calendar-date");

      if (date2.getMonth() == date.getMonth() && date2.getFullYear() == date.getFullYear() && date2.getDate() == date.getDate()) return days.get(i);
    }

    return null;
  };

  _.extend(Calendar.prototype, Backbone.Events);

  return {
    create: function(ele, options) {
      return new Calendar(ele, options);
    }
  };
});
