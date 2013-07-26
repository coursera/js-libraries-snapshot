define([
  'jquery', 
  'underscore'],
function($,  _) {

  var _private = {
    defaults: {
      'bind.focus': 'focus',
      'bind.blur': 'blur',
      'bind.click': 'click',
      'attribute': 'data-url',
      'attribute.input': 'data-url-input',
      'attribute.prefix': 'data-url-prefix',
      'class.focus': 'url-input-focus'
    },

    setCaretAtEnd: function(el) {
      setTimeout(function() {
        if (el.createTextRange) {
         var FieldRange = el.createTextRange();  
         FieldRange.moveStart('character', el.value.length);  
         FieldRange.collapse();  
         FieldRange.select();  
         }  
        else if(el.setSelectionRange) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    },

    readDataAttributes: function($anchor, prefix, defaults) {
      var settings = {};

      for (var key in defaults) {
        var attr = $anchor.attr(prefix + key.replace(/\./g, '-'))
        settings[key] = attr === undefined ? defaults[key] : attr;
      }

      return settings;
    },

    clone: function(input) {
      $input = $(input)

       // clone input to a hidden input to preserve full url
      if(!$input.data('urlhidden')) {
        var hidden = $('<input>').attr({name:$input.attr('name'), type:'hidden'});
        $input.data({urlhidden:hidden}).attr({name:''});
        $input.parent().append(hidden);
      }
    },

    focus: function(input, options) {
      $input = $(input);
      options = _.extend({}, options, _private.readDataAttributes($input, options['attribute'] + '-', _private.defaults));

      var val = $input.val();
      var prefix = $input.parent().find('[' + options['attribute.prefix'] + ']').text();

      $input.parent().addClass(options['class.focus']);
      $input.val(prefix + val);

      _private.setCaretAtEnd($input[0]);
      _private.clone(input);
    },

    blur: function(input, options) {
      $input = $(input);
      options = _.extend({}, options, _private.readDataAttributes($input, options['attribute'] + '-', _private.defaults));

      var regex = $input.attr(options['attribute.input']);
      var value = $input.val();
      var match = value.match(new RegExp(regex || $input.parent().find('[' + options['attribute.prefix'] + ']').text()));

      if(match) {
        $input.parent().find('[' + options['attribute.prefix'] + ']').text(match[0]);
        $input.val(value.replace(new RegExp(regex), ''));
        $input.data('urlhidden').val(value);
      } else {
        $input.val('');
        $input.data('urlhidden').val('');
      }

      $input.parents('[' + options['attribute'] + ']').removeClass(options['class.focus']);
    }
  };

  var external = function() {
  };

  external.start = function(view, _options) {
    var $view = $(view);
    var options = _.extend({}, _private.defaults, _options);

    $view.on(options['bind.click'] + '.urlinput', '[' + options['attribute'] + ']', function(e) {
      if($(e.target).attr(options['attribute.input']) === undefined) {
        $(e.target).parents('[' + options['attribute'] + ']').find('[' + options['attribute.input'] + ']').focus();
      }
    });

    $view.on(options['bind.focus'] + '.urlinput', '[' + options['attribute.input'] + ']', function(e) {
      _private.focus(this, options);
    });

    $view.on(options['bind.blur'] + '.urlinput', '[' + options['attribute.input'] + ']', function(e) {
      _private.blur(this, options);
    });
  };

  external.stop = function(view) {
    var $view = $(view);
    $view.unbind(".urlinput");
  };

  external.initialize = function(view, _options) {
    var $view = $(view);
    var options = _.extend({}, _private.defaults, _options);
    $view.find('[' + options['attribute.input'] + ']').each(function() {
      _private.clone(this);
      _private.blur(this, options);
    });
  };

  // kick it off!
  external.start('body');

  return external;
});
