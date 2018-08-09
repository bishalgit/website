odoo.define('website_press.views', function(require) {
    'use strict';

    var bus = require('bus.bus').bus;
    var core = require('web.core');
    var Dialog = require('web.Dialog');
    var PressConfig = require('website_press.classes').PressConfig;
    var Widget = require('web.Widget');

    var qweb = core.qweb;
    var _t = core._t;

    require('web.dom_ready');

    var PressApp = Widget.extend({
        template: 'website_press.app',
        xmlDependencies: ['/website_press/static/src/xml/press_views.xml'],

        /* Lifecycle */
        init: function(parent, options) {
            this._super.apply(this, arguments);
            this.pressConfig = new PressConfig({ id: odoo.csrf_token });
        },
        willStart: function() {
            return $.when(this._super.apply(this, arguments),
                this.pressConfig.fetchAllPosts()
            ).then(function(pressConfig) {
                bus.update_option('website.press', '1');
            });
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {

                // Create and append post list
                self.list = new PostList(self, self.pressConfig.posts);
                self.list.appendTo($('.o_post_list'));


                // self.notification_manager = new notification.NotificationManager(self);
                // self.notification_manager.appendTo(self.$el);

                // Register events in bus
                bus.on('notification', self, self._onNotification);
            });
        },

        /**
         * Handle bus notification.
         *
         * Currently, 3 notification types are handled in this page:
         *     - new_post: a post has been added
         *     - update_post: a post has been updated
         *     - unlink_post: a post has been deleted
         *
         * @param  {Array} notifications Array of notification arriving through the bus.
         */
        _onNotification: function(notifications) {
            var self = this;
            for (var notif of notifications) {
                var channel = notif[0],
                    message = notif[1];
                if (channel[1] !== 'website.press') {
                    return;
                }
                if (message[0] === 'new_post') {
                    var post_id = message[1];
                    if (!this.pressConfig.posts.find(t => t.id === post_id)) {
                        this.pressConfig.fetchPost(post_id).then(function(new_post) {
                            self.list.insertPost(new_post);
                        });
                    }
                } else if (message[0] === 'update_post') {
                    var post_id = message[1];
                    if (this.pressConfig.posts.find(t => t.id === post_id)) {
                        this.pressConfig.fetchPost(post_id).then(function(update_post) {
                            self.list.updatePost(update_post);
                        });
                    }
                } else if (message[0] === 'unlink_post') {
                    self.pressConfig.removePost(message[1]);
                    self.list.posts = self.pressConfig.posts;
                    self.list.removePost(message[1]);
                }
            }
        },
    });

    var PostList = Widget.extend({
        template: 'website_press.post_list',
        /* Lifecycle */
        init: function(parent, posts) {
            this._super.apply(this, arguments);
            this.posts = posts;
            this.parent = parent;
            this.offset = 0;
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {
                // Bind events for swap controllers
                self.load_more = self.$('.load_more');
                console.log(self.load_more.attr('data-offset'));
                self.load_more.on('click', _.bind(self.loadPosts, self));
            });
        },
        loadPosts: function(ev) {
            var self = this;
            // $(ev.target).disabled = true;
            console.log('Loading Posts...');
            console.log(self.load_more.attr('data-offset'));
            this.parent.pressConfig.fetchAllPosts($(ev.target).attr('data-offset')).then(function (pressConfig) {
                console.log(self.load_more.attr('data-offset'));
                console.log(pressConfig.posts);
                self.load_more.attr('data-offset', pressConfig.posts.length);
                console.log(self.load_more.attr('data-offset'));
                (pressConfig.getPostsOffset()).forEach(post => {
                    self.appendPost(post);
                });
                // $(ev.target).disabled = false;
                return;
            });
        },
        /**
         * Append old posts instance in the list.
         * @param  {OdooClass.Post} Post to insert in the list
         */
        appendPost: function(post) {
            if (!this.$('.press_list_body').length) {
                this._rerender();
                return;
            }
            var post_node = qweb.render('website_press.post_list.post', { post: post });
            this.$('.press_list_body').append(post_node);
        },
        /**
         * Insert a new post instance in the list. If the list is hidden
         * (because there was no post prior to the insertion), call for
         * a complete rerendering instead.
         * @param  {OdooClass.Post} Post to insert in the list
         */
        insertPost: function(post) {
            if (!this.$('.press_list_body').length) {
                this._rerender();
                return;
            }
            var post_node = qweb.render('website_press.post_list.post', { post: post });
            this.$('.press_list_body').prepend(post_node);
        },
        /**
         * Update an existing post instance in the list.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        updatePost: function(post) {
            var post_node = qweb.render('website_press.post_list.post', { post: post });
            this.$('div[data-id=' + post.id + ']').replaceWith(post_node);
        },
        /**
         * Remove a branch from the list. If this is the last branch to be
         * removed, rerender the widget completely to reflect the 'empty list'
         * state.
         * @param  {Integer} id ID of the branch to remove.
         */
        removePost: function(id) {
            this.$('div[data-id=' + id + ']').remove();
            if (!this.$('div[data-id]').length) {
                this._rerender();
            }
        },

        /**
         * Rerender the whole widget; will be useful when we switch from
         * an empty list of branches to one or more branch (or vice-versa)
         * by using the bus.
         */
        _rerender: function() {
            var self = this;
            this.replaceElement(qweb.render('website_press.post_list', { widget: this }));
        },
    });

    var $elem = $('.o_press_app');
    var app = new PressApp(null);
    app.appendTo($elem).then(function() {
        bus.start_polling();
    });
})