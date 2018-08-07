odoo.define('website_press.classes', function(require) {
    'use strict';

    var Class = require('web.Class');
    var rpc = require('web.rpc');

    /**
     * Branches
     * Represents a branch.location object from the Backend
     * @type {OdooClass}
     */
    var Post = Class.extend({
        init: function(values) {
            Object.assign(this, values);
        },
        /**
         * Fetch the latest fields for this particular branch
         * on the backend server
         * @return {jQuery.Deferred} Resolves to the updated
         *                           Branch if successful.
         */
        update: function() {
            var self = this;
            return rpc.query({
                model: 'website.press',
                method: 'read',
                args: [
                    [this.id]
                ],
                kwargs: { fields: ['id', 'name', 'active', 'description', 'image', 'datetime', 'topic', 'category', 'external_link'] }
            }).then(function(post_values) {
                Object.assign(self, post_values[0]);
                return self;
            });
        },
    });


    /**
     * Press Post
     * Represents a press config from the Backend in future,
     * accessible by default.
     * The Post class also represents a Post collection.
     * @type {OdooClass}
     */
    var PressConfig = Class.extend({
        init: function(values) {
            Object.assign(this, values);
            this.posts = [];
        },

        /**
         * Fetch the default fields for the map config on the server.
         * @return {jQuery.Deferred} Resolves to the udpate MapConfig.
         */
        fetchPressConfigInfo: function() {
            var self = this;
            return rpc.query({
                'route': '/website_press/get_press_config',
                params: {
                    id: this.id,
                    fields: ['id', 'name', 'active', 'description', 'image', 'datetime', 'topic', 'category', 'external_link']
                },
                // kwargs: { fields: ['id', 'type', 'zoom'] }
            }).then(function(press_values) {
                Object.assign(self, press_values[0]);
                return self;
            });
        },
        /**
         * Fetch all available branches for the current map.
         * Note that the actual search is done server side
         * using the model's ACLs and Access Rules.
         * @return {jQuery.Deferred} Resolves to the udpated MapConfig
         *                           (with its Branches collection
         *                           populated).
         */
        fetchAllPosts: function() {
            var self = this;
            return rpc.query({
                'route': '/website_press/get_posts',
                params: {
                    fields: ['id', 'name', 'active', 'description', 'image', 'datetime', 'topic', 'category', 'external_link']
                },
            }).then(function(post_values) {
                for (var vals of post_values) {
                    self.posts.push(new Post(vals));
                }
                return self;
            });
        },
        /**
         * Fetch a specified branch id for the current MapConfig.
         * @param  {Integer} id ID of the branch to fetch.
         * @return {jQuery.Deferred} Resolves to the new Branch
         */
        fetchPost: function(id) {
            var self = this;
            return rpc.query({
                'route': '/website_press/get_posts',
                params: {
                    id: id,
                    fields: ['id', 'name', 'active', 'description', 'image', 'datetime', 'topic', 'category', 'external_link']
                },
            }).then(function(post_values) {
                if (post_values.length) {
                    var post = new Post(post_values[0]);
                    var t_idx = self.posts.findIndex(t => t.id === id);
                    if (t_idx !== -1) {
                        self.posts.splice(t_idx, 1, post);
                    } else {
                        self.posts.push(post);
                    }
                }
                return post;
            });
        },
        /**
         * Remove a specified branch id from the collections.
         * @param  {Integer} id ID of the branch to remove
         */
        removePost: function(id) {
            var self = this;
            var t_idx = self.posts.findIndex(t => t.id === id);
            if (t_idx !== -1) {
                self.posts.splice(t_idx, 1);
            }
        },
    });

    return {
        Post: Post,
        PressConfig: PressConfig,
    };
});