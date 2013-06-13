/* This file exposes RESTful functions that override jQuery AJAX functionality to:
 *  - create and clear CSRF tokens
 *  - show loading and loaded messages during requests
 *  - provide support for PATCH via the HTTP method override header
 *  Usage example:
 *    Coursera.api = API('api/');
 *  You can also pass in options, see the defaults hash for the possibilities.
 */
(function(wndw) {

  // Count of total inflight XmlHttpRequests. We set the CSRF cookie at the start of the first request, but don't
  // change it for new requests if others are still in flight because Safari gets confused and sends the wrong
  // cookies. When this count reaches 0, we clear the CSRF cookie.
  //
  // THIS LIBRARY SHOULD NOT BE PULLED IN AS AMD AND NON-AMD
  // otherwise there could be a race condition in SAFARI where cookies get deleted at innapropriate times
  // if multiple ajax calls are in-flight between the different versions
  var globalActiveAjaxCount = 0;

  var api = function($, _, cookie, Backbone) {

    var _private = {
      defaults: {
        'type': 'normal',
        'csrf.token': 'X-CSRFToken',
        'csrf.cookie': 'csrftoken',
        'csrf.path': null,
        'csrf.domain': null,
        'emulate.patch': true,
        'emulate.put': false,
        'emulate.delete': false
      },

      csrfGet: function() {
        // If there is an existing CSRF cookie, there must be an inflight AJAX request (see globalActiveAjaxCount),
        // so we leave that cookie to avoid confusing Safari and have it send the wrong cookie with previous AJAX calls.
        // Otherwise, generate a new CSRF.
        var token = cookie.get(this.options['csrf.cookie']);
        if (token) {
          return token;
        } else {
          return _private.csrfSet.call(this, _private.csrfMake());
        }
      },

      csrfClear: function() {
        cookie.clear(this.options['csrf.cookie'], {
          secure:this.options['csrf.secure'], 
          path: this.options['csrf.path'],
          domain: this.options['csrf.domain']
        });
      },

      csrfSet: function(token) {
        cookie.set(this.options['csrf.cookie'], token, {
          secure: this.options['csrf.secure'],
          path: this.options['csrf.path'],
          domain: this.options['csrf.domain'],
          expires: new Date(new Date().getTime() + 60000)
        });
        return token;
      },

      csrfMake: function(length, chars) {
        var output = [];

        chars = chars || "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        length = length || 24;
        for (var i = 0; i < length; i++)
        output.push(chars[Math.floor(Math.random() * chars.length)]);
        return output.join('');
      },

      invoke: function(path, _options) {
        var options = _options || {};
        var url;
        if (path.indexOf('http') !== 0) {
          url = this.root + path;
        } else {
          url = path;
        }

        this.trigger("before", url, options);

        var params = (options.type == 'GET') ? options.data : null;
        var remove = function(e, item) {
          this.remove(item.options.id);
        };
        var message = options.message || {};
        var codes = message.codes ? _.keys(message.codes) : [];
        var asyncMessage = this.options.message;
        var that = this;
        delete options.message;

        // For non-GET requests, decide how to format the data for the server
        // We convert to JSON if the API type is 'rest' and the AJAX call options
        // didnt set processData to true.
        if (options.type != "GET" && _.isUndefined(options.processData) && this.options.type == 'rest') {
          options.contentType = "application/json; charset=utf-8";
          options.processData = false;
          options.data = JSON.stringify(options.data);
        }

        options.beforeSend = function() {
          globalActiveAjaxCount++;
        };
        var jqXHR = $.ajax(url, options);

        // does this api support showing messages?
        if (asyncMessage) {
          // a message to display on load
          if (message.waiting) {
            var waitID = asyncMessage.add($("<div>")
              .append(message.waiting)
              .addClass("waiting"), {
              delay: 100
            });
            jqXHR.always(function(jqXHR, textStatus) {
              asyncMessage.remove(waitID);
            });
          }

          // a message to display on success
          if (message.success || (message.codes && _.min(codes) < 300)) {
            jqXHR.done(function(jqXHR, textStatus) {
              if (message.codes && message.codes[jqXHR.status]) {
                asyncMessage.add($("<div>")
                  .append(message.codes[jqXHR.status])
                  .addClass("success"), {
                  timeout: 500
                });
              } else if (message.success) {
                asyncMessage.add($("<div>")
                  .append(message.success)
                  .addClass("success"), {
                  timeout: 500
                });
              }
            });
          }

          // a message to display on error
          if (message.error || message.timeout || (message.codes && _.max(codes) >= 300)) {
            jqXHR.fail(function(jqXHR, textStatus) {
              if (message.timeout && textStatus == "timeout") {
                asyncMessage.add($("<div>")
                  .append(message.timeout)
                  .addClass("error"), {
                  events: {
                    click: remove
                  }
                });
              } else if (message.codes && message.codes[jqXHR.status]) {
                asyncMessage.add($("<div>")
                  .append(message.codes[jsXHR.status])
                  .addClass("error"), {
                  events: {
                    click: remove
                  }
                });
              } else if (message.error) {
                asyncMessage.add($("<div>")
                  .append(message.error)
                  .addClass("error"), {
                  events: {
                    click: remove
                  }
                });
              }
            });
          }
        }

        var start = (new Date()).getTime();

        that.trigger('send', {
          xhr: jqXHR,
          url: url
        });

        jqXHR.always(function() {
          if (--globalActiveAjaxCount === 0) {
            _private.csrfClear.call(that);
          }
          that.trigger('always', {
            xhr: jqXHR,
            url: url,
            params: params,
            timing: (new Date()).getTime() - start
          });
        });

        jqXHR.fail(function() {
          that.trigger('fail', {
            xhr: jqXHR,
            url: url,
            params: params
          });
        });

        return jqXHR;
      },

      restify: function(method, _options) {
        var options = _options || {};
        options.data = options.data || {}; // need this to be an object
        options.headers = options.headers || {}; // need this to be an object

        switch (method) {
        case "POST":
          options.type = "POST";
          break;

        case "PATCH":
          if (this.options['emulate.patch']) {
            options.type = "POST";
            options.headers['X-HTTP-Method-Override'] = "PATCH";
          } else {
            options.type = "PATCH";
          }
          break;

        case "PUT":
          if (this.options['emulate.put']) {
            options.type = 'POST';
            options.headers['X-HTTP-Method-Override'] = "PUT";
          } else {
            options.type = 'PUT';
          }
          break;

        case "DELETE":
          if (this.options['emulate.delete']) {
            options.type = "POST";
            options.headers['X-HTTP-Method-Override'] = "DELETE";
          } else {
            options.type = 'DELETE';
          }
          break;

        default:
          options.type = "GET";
          break;
        }

        if (options.type != 'GET') {
          options.headers[this.options['csrf.token']] = _private.csrfGet.call(this);
        }

        return options;
      }
    };

    var api = function(root, options) {
      this.root = root;
      this.options = _.extend({}, _private.defaults, options);
    };

    // options include any $.ajax options you would normally include
    // just be aware that this library takes care of csrf headers, GET/POST types, X-HTTP-METHOD-OVERRIDE, and converting data to json
    //
    // if the api object was instatiated with the asyncMessage, you can optionally turn on global messages for any of your ajax calls
    // you can include a message object with the following optional options 
    //
    // message.waiting -> a string/html, selector or jquery element that will be inserted into the main asyncMessage box on the page
    //    it will dissapear once the ajax call returns
    //
    // message.error -> a string/html, selector or jquery element that will be inserted into the main asyncMessage box
    //    it triggers on a failed ajax call and will dissapear once the user clicks on it
    //
    // message.success -> a string/html, selector or jquery element that will be inserted into the main asyncMessage box
    //    it triggers on a successful ajax call will dissapear after a 500ms timeout
    //
    // message[200->500] -> a string/html, selector or jquery element that will be inserted into the main asyncMessage box
    //    it triggers when that status code is returned by the ajax call, and 200->300 dissapears on timeout and >400 dissapears on click
    //
    // you can override the global asyncMessage by passing in a third paramter to the get/patch/delete/post calls as needed

    api.prototype.get = function(path, options) {
      return _private.invoke.call(this, path, _private.restify.call(this, "GET", options));
    };

    api.prototype.patch = function(path, options) {
      return _private.invoke.call(this, path, _private.restify.call(this, "PATCH", options));
    };

    api.prototype['delete'] = function(path, options) {
      return _private.invoke.call(this, path, _private.restify.call(this, "DELETE", options));
    };

    api.prototype.post = function(path, options) {
      return _private.invoke.call(this, path, _private.restify.call(this, "POST", options));
    };

    api.prototype.put = function(path, options) {
      return _private.invoke.call(this, path, _private.restify.call(this, "PUT", options));
    };

    _.extend(api.prototype, Backbone.Events);

    return function(root, options) {
      return new api(root, options);
    };
  };


  if(typeof define === "function" && define.amd) {
    define([
        "jquery",
        "underscore",
        "js/lib/cookie",
        "backbone",
        "js/lib/json2"
        ], function($, _, Cookie, Backbone) { 
      return api($, _, Cookie, Backbone);
    });
  } else {
    wndw.API = api(wndw.$, wndw._, wndw.Cookie, wndw.Backbone);
  }

})(window);
