odoo.define('website_branch_map.views', function(require) {
    'use strict';

    var bus = require('bus.bus').bus;
    var core = require('web.core');
    var Dialog = require('web.Dialog');
    var MapConfig = require('website_branch_map.classes').MapConfig;
    var MapWidget = require('website_branch_map.map_widget');
    var Widget = require('web.Widget');

    var qweb = core.qweb;
    var _t = core._t;

    require('web.dom_ready');

    var BranchLocationApp = Widget.extend({
        template: 'website_branch_map.app',
        // events: {
        //     'click .ticket_about': function(ev) {
        //         ev.preventDefault();
        //         Router.navigate('/about');
        //     },
        //     'click button.o_new_ticket': function() { Router.navigate('/new'); },
        // },
        // custom_events: {
        //     'warning': function(ev) { this.notification_manager.warn(ev.data.msg); },
        //     'notify': function(ev) { this.notification_manager.notify(ev.data.msg); },
        // },
        xmlDependencies: ['/website_branch_map/static/src/xml/branch_views.xml', '/website_branch_map/static/src/xml/gmap.xml'],
        /* Lifecycle */
        init: function(parent, options) {
            this._super.apply(this, arguments);
            this.mapConfig = new MapConfig({ id: odoo.csrf_token });
        },
        willStart: function() {
            return $.when(this._super.apply(this, arguments),
                this.mapConfig.fetchAllBranches()
            ).then(function(mapConfig) {
                bus.update_option('branch.location', '1');
            });
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {
                /**
                 * Check if google library has completed loading
                 * If yes then intialize maps and plot locations
                 */
                self.t = setInterval(function() {
                    if (typeof google != 'undefined') {
                        self._onReady();
                    }
                }, 1000);

                // Create and append branch list
                self.list = new BranchList(self, self.mapConfig.branches);
                self.list.appendTo($('.o_branch_list'));

                // Create and append current branch
                self.swap = new BranchSwap(self, self.mapConfig.getCurrentBranch());
                self.swap.appendTo($('.location-swapper'));

                // self.notification_manager = new notification.NotificationManager(self);
                // self.notification_manager.appendTo(self.$el);

                core.bus.on('onClickNextBranch', self, self._nextBranch);
                core.bus.on('onClickPrevBranch', self, self._prevBranch);

                // Register events in bus
                bus.on('notification', self, self._onNotification);
            });
        },
        /**
         * 
         */
        _onReady: function() {
            var self = this;

            if (self.t) {
                clearInterval(self.t);
            }

            self.map_widget = new MapWidget(self);
            self.map_widget.prependTo(self.$el);
        },
        /**
         * Call next_branch to load next branch instance
         *
         * @param  {Event} event object
         */
        _nextBranch: function(ev) {
            var branch = this.mapConfig.nextBranch();
            this.swap.swapBranch(branch);
            this.map_widget.swapMarker(branch);
        },
        /**
         * Call prev_branch to load previous branch instance
         *
         * @param  {Event} event object
         */
        _prevBranch: function(ev) {
            var branch = this.mapConfig.prevBranch();
            this.swap.swapBranch(branch);
            this.map_widget.swapMarker(branch);
        },

        /**
         * Handle bus notification.
         *
         * Currently, 2 notification types are handled in this page:
         *     - new_branch: a branch has been added
         *     - unlink_branch: a branch has been deleted
         *
         * @param  {Array} notifications Array of notification arriving through the bus.
         */
        _onNotification: function(notifications) {
            var self = this;
            for (var notif of notifications) {
                var channel = notif[0],
                    message = notif[1];
                if (channel[1] !== 'branch.location') {
                    return;
                }
                if (message[0] === 'new_branch') {
                    var branch_id = message[1];
                    if (!this.mapConfig.branches.find(t => t.id === branch_id)) {
                        this.mapConfig.fetchBranch(branch_id).then(function(new_branch) {
                            self.list.insertBranch(new_branch);
                            if (!self.swap.branch) {
                                self.swap.swapBranch(new_branch);
                                self.map_widget.swapMarker(new_branch);
                            } else {
                                self.map_widget.swapMarker(new_branch, true);
                            }
                        });
                    }
                } else if (message[0] === 'update_branch') {
                    var branch_id = message[1];
                    if (this.mapConfig.branches.find(t => t.id === branch_id)) {
                        this.mapConfig.fetchBranch(branch_id).then(function(update_branch) {
                            self.list.updateBranch(update_branch);
                            self.map_widget.updateMarker(update_branch);
                            if ((self.swap.getBranch()).id == update_branch.id) {
                                var branch = self.mapConfig.getCurrentBranch();
                                self.swap.swapBranch(branch);
                            }
                        });
                    }
                } else if (message[0] === 'unlink_branch') {
                    self.mapConfig.removeBranch(message[1]);
                    self.list.branches = self.mapConfig.branches;
                    self.list.removeBranch(message[1]);
                    self.map_widget.removeBranch(message[1]);
                    if ((self.swap.getBranch()).id == message[1]) {
                        var branch = self.mapConfig.getCurrentBranch();
                        self.swap.swapBranch(branch);
                        self.map_widget.swapMarker(branch);
                    }
                }
            }
        },
    });

    var BranchList = Widget.extend({
        template: 'website_branch_map.branch_list',
        /* Lifecycle */
        init: function(parent, branches) {
            this._super.apply(this, arguments);
            this.branches = branches;
        },
        /**
         * Insert a new branch instance in the list. If the list is hidden
         * (because there was no branch prior to the insertion), call for
         * a complete rerendering instead.
         * @param  {OdooClass.Branch} branch Branch to insert in the list
         */
        insertBranch: function(branch) {
            if (!this.$('.modal-body').length) {
                this._rerender();
                return;
            }
            var branch_node = qweb.render('website_branch_map.branch_list.branch', { branch: branch });
            this.$('.modal-body').prepend(branch_node);
        },
        /**
         * Update an existing branch instance in the list.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        updateBranch: function(branch) {
            var branch_node = qweb.render('website_branch_map.branch_list.branch', { branch: branch });
            this.$('div[data-id=' + branch.id + ']').replaceWith(branch_node);
        },
        /**
         * Remove a branch from the list. If this is the last branch to be
         * removed, rerender the widget completely to reflect the 'empty list'
         * state.
         * @param  {Integer} id ID of the branch to remove.
         */
        removeBranch: function(id) {
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
            this.replaceElement(qweb.render('website_branch_map.branch_list', { widget: this }));
        },
    });

    var BranchSwap = Widget.extend({
        template: 'website_branch_map.branch_swap',
        /* Lifecycle */
        init: function(parent, branch) {
            this._super.apply(this, arguments);
            this.branch = branch;
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {
                // Bind events for swap controllers
                self.$('.fa-angle-left').on("click", _.bind(self.prevBranch, self));
                self.$('.fa-angle-right').on("click", _.bind(self.nextBranch, self));
                self.get_direction = self.$('.get_direction');
                self.get_direction.attr("href", self.generateGetDirection());

                core.bus.on('onMarkerSwap', self, self._swapBranch);
            });
        },
        /**
         * Return current branch instance.
         * @return {OdooClass.Branch} Return current branch instance for MapConfig.
         */
        getBranch: function() {
            return this.branch;
        },
        /**
         * Trigger next branch event
         */
        nextBranch: function(ev) {
            core.bus.trigger('onClickNextBranch', ev);
        },
        /**
         * Trigger previous branch
         */
        prevBranch: function(ev) {
            core.bus.trigger('onClickPrevBranch', ev);
        },
        /**
         * Swap branch instance.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        _swapBranch: function(branch) {
            console.log("slkdjflskj");
            this.swapBranch(branch);
        },
        /**
         * Swap branch instance.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        swapBranch: function(branch) {
            var self = this;
            if (!self.$('.current_branch').length) {
                self._rerender();
                return;
            }
            var branch_node = qweb.render('website_branch_map.branch_swap.content', { branch: branch });
            if (!self.branch) {
                self.$('.current_branch').prepend(branch_node);
            } else {
                self.$('div[data-swap-id=' + self.branch.id + ']').replaceWith(branch_node);
            }
            self.branch = branch;
            self.get_direction.attr("href", self.generateGetDirection());
        },
        /**
         * Update an current branch instance.
         * @param  {OdooClass.Branch} branch Branch to update
         */
        updateBranch: function(branch) {
            var branch_node = qweb.render('website_branch_map.branch_swap.content', { branch: branch });
            this.$('div[data-swap-id=' + branch.id + ']').replaceWith(branch_node);
            self.branch = branch;
        },
        /**
         * 
         */
        generateGetDirection: function() {
            return "https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=" + this.branch.lat + "," + this.branch.lng;
        },
        /**
         * Rerender the whole widget; will be useful when we switch from
         * an empty list of branches to one or more branch (or vice-versa)
         * by using the bus.
         */
        _rerender: function() {
            this.replaceElement(qweb.render('website_branch_map.branch_swap', { widget: this }));
        },
    });

    var $elem = $('.o_branch_location_app');
    if (!$elem.length) {
        return $.Deferred().reject("DOM doesn't contain '.o_branch_location_app'");
    }
    var app = new BranchLocationApp(null);
    app.appendTo($elem).then(function() {
        bus.start_polling();
    });
});