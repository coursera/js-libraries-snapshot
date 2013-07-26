/** Share Buttons

Why does this library exist?
==============================
We often want to encourage users to share a piece of content via their social network of choice. We could use the
iframe widgets from the networks, like the Facebook and Twitter share buttons that display friends and counts, but
using those has some drawbacks:
* It is hard to fit them into a small space.
* It is hard to position them nicely next to eachother.
* It is hard to get them to blend in with the look and feel of the surrounding page.
* The user must wait for all of their iframe HTML and assets to load before seeing/using them.


How do you use this library?
==============================

The share buttons library is a small library that creates icons of the same size and color for the desired social networks 
(Google+, Twitter, or Facebook), links them to the appropriate share URL, and tracks clicks using our eventing library.

The typical usage is to define the buttons and their options in HTML first. Notice that some options are common, like url and text,
whilst others are specific to a network, like the Facebook redirect and Twitter hash tags:

<div data-url="https://site.dev-coursera.org/course/fpgm"
     data-text="I'm taking Fake Probabilistic Graphical Models on Coursera!"
     data-facebook-picture="https://s3.amazonaws.com/coursera/topics/ml/small-icon.hover.png"
     data-facebook-name="I'm taking Fake Probabilistic Graphical Models on Coursera!"
     data-facebook-redirect="https://www.coursera.org/"
     data-twitter-text="I'm taking Fake Probabilistic Graphical Models on @Coursera!"
     data-twitter-hashtags="fpgm" class="coursera-share-buttons"
     data-eventing-key="user.click.link.social"
     data-eventing-value="course-mini"
     ></div>

After the HTML exists, call the library constructor on each of the relevant elements, and it will fill them in with the buttons:
self.$('.coursera-share-buttons').each(function() {
  new ShareButtons($(this));
});

In the future, this library could perhaps include other social networks (like for international users), an email option,
and an option to use the iframe widget buttons.
*/

(function(wndw) {
  /* Add a query parameter ref=<val> to the url, and return it */
  function addRef(url, val) {
    var separator = url.indexOf('?') == -1 ? '?' : '&';
    return url + separator + 'sharebuttons_ref=' + val;
  }

  function create($, Coursera) {

    /* Defaults
    ================================================== */
    var defaults = {
      url: document.location.href,
      text: document.title,
      buttons: {  //settings for buttons
        googlePlus : {  //http://www.google.com/webmasters/+1/button/
          enabled: true,
          url: '',
          icon: 'icon-google-plus-sign', 
          refkey: 'gp'
        },
        facebook: {
          enabled: true,
          url: '',
          picture: '',
          name: '',
          icon: 'icon-facebook-sign',
          refkey: 'fb'
        },
        twitter: {  //http://twitter.com/about/resources/tweetbutton
          enabled: true,
          url: '',
          hashtags: '',
          via: '',
          related: '',
          lang: 'en',
          icon: 'icon-twitter',
          refkey: 'tw'
        }
      }
    },
    /* Load share buttons asynchronously
    ================================================== */
    makeButton = function(url, type, icon, eventKey, eventVal) {
      var classname = 'coursera-sharebuttons-' + type;
      var $link = $('<a></a>');
      var trackingKey = eventKey + "." + type;
      
      $link.addClass(icon);
      $link.addClass('coursera-sharebuttons-icon');

      $link.attr('target', '_blank');
      $link.attr('href', url);
      $link.on('click', function() {
        if(Coursera && Coursera.multitracker)
        {
          Coursera.multitracker.push([trackingKey, eventVal]);
        } else {
          if(!window._204)
            window._204 = [];
          window._204.push({key:trackingKey, value: eventVal});
        }
      });

      return $link;
    },
    loadButton = {
      googlePlus: function(self){
        var sett = self.options.buttons.googlePlus;
        var url = (sett.url !== '' ? sett.url : self.options.url);
        var icon = sett.icon;
        var eventKey = $(self.element).attr('data-eventing-key');
        var eventVal = $(self.element).attr('data-eventing-value');        
        var refkey = $(self.element).attr('data-googleplus-refkey') || sett.refkey;
        
        url = addRef(url, refkey);
        var URL = 'https://plus.google.com/share?url=' + encodeURIComponent(url);
        
        $(self.element).append(makeButton(URL, 'gplus', icon, eventKey, eventVal));
      },
      facebook: function(self) {
        var sett = self.options.buttons.facebook;
        var picture = $(self.element).attr('data-facebook-picture') || sett.picture;
        var name = $(self.element).attr('data-facebook-name') || sett.name;
        var description = $(self.element).attr('data-facebook-description') || sett.description || '';
        var redirect = $(self.element).attr('data-facebook-redirect') || sett.redirect || window.location.href;
        var url = sett.url !== '' ? sett.url : self.options.url;
        var icon = sett.icon;
        var eventKey = $(self.element).attr('data-eventing-key');
        var eventVal = $(self.element).attr('data-eventing-value');
        var refkey = $(self.element).attr('data-facebook-refkey') || sett.refkey;
        url = addRef(url, refkey);
        var URL = 'http://www.facebook.com/dialog/feed?' +
          'app_id=124275634389084&' +
          'link=' +  encodeURIComponent(url) + '&' +
          'name=' + encodeURIComponent(name) + '&' + 
          'picture=' + encodeURIComponent(picture) + '&' + 
          'description=' + encodeURIComponent(description) + '&' +
          'redirect_uri=' + redirect;

        $(self.element).append(makeButton(URL, 'facebook', icon, eventKey, eventVal));
      },
      twitter : function(self){
        var $el = $(self.element);
        var sett = self.options.buttons.twitter;
        var text = $el.attr('data-twitter-text') || sett.text || self.options.text;
        var hashtags = $el.attr('data-twitter-hashtags') || sett.hashtags;
        var shareUrl = (sett.url !== '' ? sett.url : self.options.url);
        var icon = sett.icon;
        var eventKey = $(self.element).attr('data-eventing-key');
        var eventVal = $(self.element).attr('data-eventing-value');

        var refkey = $(self.element).attr('data-twitter-refkey') || sett.refkey;
        shareUrl = addRef(shareUrl, refkey);

        if($el.is('[data-twitter-autobuild]')) {
          var twitterData = {
            frontText: $el.attr('data-twitter-text-front') || sett.text || self.options.text,
            middleText: $el.attr('data-twitter-text-middle') || '',
            endText: $el.attr('data-twitter-text-end') || '',
            hashtags: hashtags, 
            url: shareUrl
          };
          twitterData = self.buildTwitter(twitterData);
          text = twitterData.text;
          hashtags = twitterData.hashtags;
          shareUrl = twitterData.url;
        }

        var URL = 'https://twitter.com/share?' + 
          'text=' + encodeURIComponent(text) + '&' +
          'hashtags=' + encodeURIComponent(hashtags) + '&' +
          'url=' + encodeURIComponent(shareUrl);
        $(self.element).append(makeButton(URL, 'twitter', icon, eventKey, eventVal));
      }
    };

    /* Plugin constructor
    ================================================== */
    function ShareButtons(element, options) {
      this.element = element;
      $(this.element).addClass('coursera-sharebuttons');

      this.options = $.extend(true, {}, defaults, options);
      
      this._defaults = defaults;
      
      this.init();
    }
    
    /* Initialization method
    ================================================== */
    ShareButtons.prototype.init = function () {
      var self = this;

      if(typeof $(this.element).data('url') !== 'undefined'){
        this.options.url = $(this.element).data('url');
      }
      if(typeof $(this.element).data('text') !== 'undefined'){
        this.options.text = $(this.element).data('text');
      }
      this.loadButtons();
    };
    
    /* loadButtons method
    ================================================== */
    ShareButtons.prototype.loadButtons = function () {
      var self = this;
      $.each(['twitter', 'facebook', 'googlePlus'], function(ind, name) {
        if (self.options.buttons[name].enabled) {
          loadButton[name](self);
        }
      });
    };

    /* buildTwitter method. Pass us this:
     * twitterData = {
     *  frontText:
     *  middleText:
     *  endText:
     *  hashtags:
     *  url:
     * }
     *
     * We will return:
     * {
     *  text:
     *  hashtags:
     *  url:
     * }
     * such that everything fits in the 140 character limit, by
     * not using all the text & hashtags from twitterData if
     * it's too long.
     ================================================= */
    ShareButtons.prototype.buildTwitter = function(twitterData) {
      // constants determined by twitter
      var twitterMaxLen = 140; // leith wants this to change
      var twitterUrlLen = 23; // all urls are 23 chars
      var twitterHashExtra = 2; // costs 2 extra chars to add a hash

      // we lengthen this until we run out of room
      var returnData = {
        text: '',
        hashtags: '',
        url: ''
      };
      var returnLength = 0;

      // always include the URL
      if(twitterData.url.length > 0) {
        returnData.url = twitterData.url;
        returnLength += twitterUrlLen;
      }

      // add as much of the front text as we can, truncating if necessary
      if(returnLength + twitterData.frontText.length <= twitterMaxLen) {
        returnData.text += twitterData.frontText;
        returnLength += twitterData.frontText.length;
      } else {
        returnData.text = twitterData.frontText.substring(0, twitterMaxLen - returnLength);
        returnLength += twitterMaxLen - returnLength;
        return returnData;
      }

      // add the hashtag if possible
      if(returnLength + twitterData.hashtags.length + twitterHashExtra <= twitterMaxLen) {
        returnData.hashtags = twitterData.hashtags;
        returnLength += twitterData.hashtags.length + twitterHashExtra;
      } else {
        return returnData;
      }

      // add the end text if possible
      if(returnLength + twitterData.endText.length <= twitterMaxLen) {
        returnData.text = twitterData.frontText + twitterData.endText;
        returnLength += twitterData.endText.length;
      } else {
        return returnData;
      }

      // add the middle text if possible
      if(returnLength + twitterData.middleText.length <= twitterMaxLen) {
        returnData.text = twitterData.frontText + twitterData.middleText + twitterData.endText;
        returnLength += twitterData.middleText.length;
      } else {
        return returnData;
      }

      return returnData;
    };

    return ShareButtons;
  }

  if(typeof define === "function" && define.amd) {
    define(["jquery", "js/core/coursera"], function($, Coursera) { 
      return create($, Coursera);
    });
  } else {
    wndw.ShareButtons = create(wndw.$, null);
  }
})(window);

