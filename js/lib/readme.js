/** ReadMes

Why does this library exist?
==============================
We want to iterate quickly on our platform, but we have actual users that grow accustomed to the interface and we don't
want to change the interface without communicating that to them. After we found ourselves frequently putting up banners 
announcing feature changes and getting annoyed at having to remember to take them down in a few weeks, we created the 
Readme library. 


How do you use this library?
==============================

Readme lets developers create a banner in HTML, customize how many times it's shown,
when it will stop showing, and whether the user should have to close it. It uses cookies to remember close state banners.

Here's an example HTML for a readme that expires on June 30th that the user must close:
<div data-readme="admin-bar-announcement" data-readme-show-count="1" data-readme-show-until-closed data-readme-show-expires="Jun 30, 2013">
    <div>
        We have something new to say to you!
    </div>
    <div class="readme-close-icon" data-readme-close>
        <span class="icon-remove"></span>
    </div>
</div>

Here's an example Jade snippet for a similar banner. Notice that we often link to a blog post (for students) or forum thread on the partners portal (for admins), since it's hard to convey a lot of information in a small banner.
div(data-readme="watchlist-announcement", data-readme-show-count="1", data-readme-show-until-closed, data-readme-show-expires="Jun 30, 2013")
  div
    | We now give students the ability to "watch" classes they're interested in, which replaces the need for TBA sessions. 
    a(href="http://moocforums/TODO", data-readme-close) Read more here.
  div.readme-close-icon(data-readme-close)
    span.icon-remove

If we want to show a banner to only admins, then we use the relevant PHP or JS functions to check if the current user is an admin,
and only write the banner into the HTML if so.

After we define readme banners in the HTML, we must call the Readme library on the relevant elements, typically in document.ready(),
or sometime after the HTML exists:
ReadMe($("[data-readme]")[0]);

Here's what that will do, depending on the data attributes:
Anytime before [data-readme-show-expires], a [data-readme-type] banner is displayed that animates down after a delay of [data-readme-show-delay] milliseconds, only if the user hasn't already seen the banner [data-readme-show-count] times. This is tracked by a cookie 
keyed by the name [data-readme-attribute-data]-[data-readme].
When [data-readme-show-until-closed] is set, the banner will show until the [data-readme-close] element encounters the [bind.close] action
[data-readme-show-count] times.
*/

(function(wndw) {

  var Module = function($, _, cookie, LucidJS, Moment, DataAttributes) {
    var _private = {
      defaults: {
        "bind.close": "click",
        "attribute.data": "data-readme", // the value of this attribute will be used as the cookie name
        "attribute.close": "data-readme-close",
        "class": "readme",
        "show.count": 0, // set if you want to force readme to show X times
        "show.until": null, // set if you want to stop showing readme after X date
        "show.until.closed": false, // set to true if you want to require the user to close readme X times
        "show.delay": 1000, // time to wait before showing readme
        "animate.open": null,
        "animate.close": null,
        "animate.duration": 250,
        "type": "banner" // banner, banner-sticky, footer-sticky, custom
      },

      open: false,
      stack: [],

      getReadMe: function(el, options) {
        var readme = $(el).data('readme.me');

        if (readme && readme.constructor == ReadMe.prototype.constructor) {
          if (options) return readme.customize(options);
          else return readme;
        } else {
          return null;
        }
      },

      makeReadMe: function(el, options) {
        var $el = $(el);
        var readme = _private.getReadMe($el);

        // if popup hasn't been created, make one!
        if (!readme) {
          readme = new ReadMe($el, options);
          $el.data("readme.me", readme);
        }

        return readme;
      },

      getCount: function() {
        var times;
        var cookieName = this.options["attribute.data"] + "-" + this.$el.attr(this.options["attribute.data"]);

        if(this.options["show.count"]) {
          times = cookie.get(cookieName);
          return times ? parseInt(times, 10) : 0;
        }

        return 0;
      },

      increaseCount: function() {
        var cookieName = this.options["attribute.data"] + "-" + this.$el.attr(this.options["attribute.data"]);

        if(this.options["show.count"]) {
          var times = _private.getCount.call(this) + 1;
          cookie.set(cookieName, times, {expires:365*100}); // set cookie to never expire
          return times;
        }

        return 0;
      },

      canShow: function() {
        var count = _private.getCount.call(this);
        var max = this.options["show.count"] ? parseInt(this.options["show.count"], 10) : 0;
        var expires = this.options["show.until"];
        var show = true;

        if (expires && Moment(expires).diff(Moment()) < 0) {
          this.emitter.trigger("expired");
          return false;
        }

        if (max && count >= max) {
          this.emitter.trigger("aged");
          return false;
        }

        if (_private.open) {
          _private.stack.push(this);
          return false;
        }

        _private.open = true;
        return true;
      }
    }

    // given an element, make it rain, allow for closing and never seeing again
    var ReadMe = function(el, options) {
      var that = this;

      this.$el = $(el);
      this.emitter = LucidJS.emitter(this);

      this.customize(options);

      window.setTimeout(function() {
        that.open();
      }, this.options["show.delay"] || 0);
    };

    ReadMe.prototype.customize = function(settings) {
      var that = this;
      var height;

      this.options = _.extend({}, DataAttributes.parse(this.$el, _private.defaults, 'data-readme-'), settings);
      this.$el.addClass(this.options["class"]);

      if(this.options.type == "banner") {
        this.$el.css({"visibility":"hidden"}).show();
        height = this.$el.outerHeight();
        this.$el.css({"visibility":"visible"}).hide();

        this.options["animate.open"] = {"margin-top":0};
        this.options["animate.close"] = {"margin-top":-height};
        this.options["animate.duration"] = 250;

        this.on("opening", function() {
          that.$el.css({"visibility":"visible", "margin-top":-height}).show().prependTo($("body"));
        });
      } else if(this.options.type == "footer-sticky") {
        this.$el.css({"visibility":"hidden"}).show();
        height = this.$el.outerHeight();
        this.$el.css({"visibility":"visible"}).hide();

        this.options["animate.open"] = {"bottom":0};
        this.options["animate.close"] = {"bottom":-height};
        this.options["animate.duration"] = 250;

        this.on("opening", function() {
          that.$el.css({"visibility":"visible", "position":"absolute", "left":0, "right":0, "bottom":-height}).show().appendTo($("body"));
        });
      }

      return this;
    };

    ReadMe.prototype.open = function() {
      var that = this;

      if (_private.canShow.call(this)) {
  
        if (!this.options["show.until.closed"] && this.options["show.count"]) {
          _private.increaseCount.call(this);
        }

        this.emitter.trigger("opening");
        _private.stack.push(this); // push readme onto top of stack

        // trigger close on any closing element inside
        this.$el.on(this.options["bind.close"] + ".readme", "[" + this.options["attribute.close"] + "]", function() {
          if(that.options["show.until.closed"] && that.options["show.count"]) {
            _private.increaseCount.call(that);
          }
          that.close();
        });

        // allow for the readme itself to be used as a closing element
        if (this.$el.is("[" + this.options["attribute.close"] + "]")) {
          this.$el.on(this.options["bind.close"] + ".readme", function() {
            if(that.options["show.until.closed"] && that.options["show.count"]) {
              _private.increaseCount.call(that);
            }
            that.close();
          });
        }

        if (this.options['animate.open']) {
          this.$el.css({"margin-top":-100}).prependTo($("body"));
          this.$el
            .animate(this.options['animate.open'], {
              duration: this.options['animate.duration'],
              complete: function() {
                that.emitter.trigger("open");
              }
            });
        } else {
          this.$el.show();
          this.emitter.trigger("open");
        }
      }
    };

    ReadMe.prototype.close = function() {
      var that = this;

      this.trigger("closing");
      _private.stack.shift(); // remove readme from top of stack

      if (this.options['animate.close']) {
        this.$el
          .animate(this.options['animate.close'], {
            duration: this.options['animate.duration'],
            complete: function() {
              that.$el.off(".readme");
              that.$el.hide().remove();
              that.emitter.trigger("close");
              _private.open = false;
              if(_private.stack.length)
                _private.stack[0].open();
            }
          });
      } else {
        this.$el.off(".readme");
        this.$el.hide().remove();
        this.emitter.trigger("close");
        _private.open = false;
        if(_private.stack.length)
          _private.stack[0].open();
      }
    };

    var external = function(el, options) {
      return _private.getReadMe(el, options) || _private.makeReadMe(el,options);
    };

    return external;
  };

  if (typeof define === "function" && define.amd) {
    define(["jquery", "underscore", "js/lib/cookie", "js/lib/lucid", "js/lib/moment", "js/lib/data.attributes"], 
    function($, _, cookie, LucidJS, Moment, DataAttributes) { 
      return Module($, _, cookie, LucidJS, Moment, DataAttributes);
    });
  } else if (typeof window !== "undefined" && typeof ender === "undefined") {
    wndw.ReadMe = Module(wndw.$, wndw._, wndw.Cookie, wndw.LucidJS, wndw.Moment, wndw.DataAttributes);
  }

})(window);
