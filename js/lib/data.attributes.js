(function() {

  var DataAttributes = function($) {
    var parse = function(el, defaults, _prefix) {

      // TODO
      // read all data- attributes if no defaults is given? (can we do this?)
      var settings = {};
      var prefix = _prefix || "";
    
      for (var key in defaults) {
        var pkey = prefix + key.replace(/\./g, '-');
        var attr = $(el).attr(pkey);
    
        // if the attr doesn't appear, then we are the default
        if(attr === undefined)
          settings[key] = defaults[key];
        // if it does appear but it is empty or the value is 'true' then set it to true
        // if the key is the same as the value, that is indicative of an empty value as well
        else if((typeof(attr) == "string" && attr.length === 0) || /^\s*true\s*$/.test(attr) || pkey == attr)
          settings[key] = true;
        // if the value is 'false' set it to false
        else if(/^\s*false\s*$/.test(attr))
          settings[key] = false;
        // otherwise, just set it to the string value
        else
          settings[key] = attr;
      }
    
      return settings;
    }

    var exports = {
      parse: parse
    };

    return exports;
  }

  if (typeof define === "function" && define.amd) {
    define(['jquery'], function($) {
      return DataAttributes($);
    });
  } else if (typeof window !== 'undefined' && typeof ender === 'undefined') {
     window.DataAttributes = DataAttributes(window.$);
  }

})();
