/* This file exposes RESTful functions that can be mixed into a Backbone Model/Collection
 *  and used instead of the usual Backbone syncing methods.
 *  The primary purpose is so that we can use the API enhancements from api.js
 *  Usage example:
 *    var CourseModel = Backbone.Model.extend({
 *       api: Coursera.api, 
 *    });
 *    _.extend(CourseModel.prototype, BackboneModelAPI);
 *    
 *    CourseModel.read().done(function() { });
 */
define([
  'backbone',
  'underscore',
  'js/lib/api'
  ],
function(Backbone, _, API) {
  var apiModel = {

    // overwrites a model/collections sync method
    // 
    // adds read/save/update/delete methods
    // pass in message.waiting, message.error and message.success to show global asyncMessages 

    sync: function(method, model, options) {
      options = _.extend({}, options);
      var that = this;
      var action = [];
      var id = this.urlId || this.idAttribute || 'id';

      // NOTE: options.url is set by backbone.relational when fetch(ing)Related a Collection
      var url = options.url ? options.url : _.isFunction(this.url) ? this.url() : this.url;

      if (!this.api) {
        var urlRoot = url || (_.isFunction(this.urlRoot) ? this.urlRoot() : this.urlRoot);
        this.api = API(urlRoot);
      }
      if (method == "create") {
        options.data = _.extend(this.toJSON(), options.data || {});
        return this.api.post(url, options);
      } else if (method == "update") {
        if (this.partialUpdate) {
          options.data = _.extend(this.changedAttributes() || {}, options.data || {});
          if (options.force) {
            if(_.isArray(options.force)) {
              _.each(options.force, function(force) {
                options.data[force] = that.get(force);
              });
            } else {
              options.data[options.force] = this.get(options.force);
            }
          }
          return this.api.patch(url + '/' + this.get(id), options);
        } else {
          options.data = _.extend(this.toJSON(), options.data || {});
          return this.api.put(url + '/' + this.get(id), options);
        }
      } else if (method == "delete") {
        return this.api['delete'](url + '/' + this.get(id), options);
      } else if (method == "read") {
        if (this instanceof Backbone.Collection || this.get(id) === undefined) return this.api.get(url, options);
        else return this.api.get(url + '/' + this.get(id), options);
      }
    },

    create: function(options, callback) {
      var that = this;
      return this.save(null, options)
        .done(function(data) {
        if (callback) callback.call(that, null, data);
      })
        .fail(function(jqXHR, textStatus) {
        if (callback) callback.call(that, textStatus);
      });
    },

    update: function(attributes, _options, callback) {
      var that = this;
      var options = _options || {};
      // by default, we want this to not trigger any backbone events
      if (attributes && !this.isNew()) options.silent = (options.silent !== undefined) ? options.silent : true;
      return this.save(attributes, options)
        .done(function(data) {
        if (callback) callback.call(that, null, data);
      })
        .fail(function(jqXHR, textStatus) {
        if (callback) callback.call(that, textStatus);
      });
    },

    read: function(options, callback) {
      var that = this;
      return this.fetch(options)
        .done(function(data) {
        if (callback) callback.call(that, null, data);
      })
        .fail(function(jqXHR, textStatus) {
        if (callback) callback.call(that, textStatus);
      });
    },

    "delete": function(options, callback) {
      var that = this;
      return this.destroy(options)
        .done(function(data) {
        if (callback) callback.call(that, null, data);
      })
        .fail(function(jqXHR, textStatus) {
        if (callback) callback.call(that, textStatus);
      });
    }
  };

  return apiModel;
});
