/* This file exposes a familiar interface for setting logging level
 *  and using the console API appropriately.
 * The primary purpose is to encourage logging in development but shut it off by default in testing/prod.
 */
(function(wndw) {

  var module = function() {

    // wrap console.log, in case its accidentally or purposefully used
    wndw.console      = wndw.console || {};
    wndw.console.log  = wndw.console.log || function() {};
    wndw.console.error= wndw.console.error || function() {};
    wndw.console.warn = wndw.console.warn || function() {};
    wndw.console.info = wndw.console.info || function() {};

    var Logger = function(options) {
      this.options = options || {};
    };

    Logger.prototype.customize = function(options) {
      this.options = options || {};
      return this;
    };

    Logger.prototype.info = function() {
      if(this.options.level == 'info') {
        wndw.console.info.apply(wndw.console, arguments);
      }
      return this;
    };

    Logger.prototype.warn = function() {
      if(/info|warn/.test(this.options.level)) {
        wndw.console.warn.apply(wndw.console, arguments);
      }
      return this;
    };

    Logger.prototype.error = function() {
      if(/error|warn|info/.test(this.options.level)) {
        wndw.console.error.apply(wndw.console, arguments);
      }
      return this;
    };

    var exports = function(options) {
      return new Logger(options);
    };

    return exports;
  }

  if (typeof define === "function" && define.amd) {
    define([], function() {
      return module();
    });
  } else if (typeof wndw !== 'undefined' && typeof ender === 'undefined') {
     wndw.Log = module();
  }

})(window);
