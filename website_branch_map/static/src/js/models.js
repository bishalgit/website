odoo.define('website_branch_map.classes', function(require) {
    'use strict';

    var Class = require('web.Class');
    var rpc = require('web.rpc');

    /**
     * Branches
     * Represents a branch.location object from the Backend
     * @type {OdooClass}
     */
    var Branch = Class.extend({
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
                model: 'branch.location',
                method: 'read',
                args: [
                    [this.id]
                ],
                kwargs: { fields: ['id', 'name', 'active', 'description', 'address', 'telephone', 'email', 'lat', 'lng', 'sequence'] }
            }).then(function(branch_values) {
                Object.assign(self, branch_values[0]);
                return self;
            });
        },
    });


    /**
     * Map
     * Represents a google.map.config from the Backend in future, 
     * accessible by default.
     * The Map class also represents a Branch collection.
     * @type {OdooClass}
     */
    var MapConfig = Class.extend({
        init: function(values) {
            Object.assign(this, values);
            this.branches = [];
            this.current_branch_index = -1;
        },
        /**
         * Assign next branch instance to show the map config on the server.
         *
         * @return {OdooClass.Branch} Return next branch instance for MapConfig.
         */
        nextBranch: function() {
            var self = this;
            self.current_branch_index = (self.current_branch_index + 1) % self.branches.length;
            return self.branches[self.current_branch_index];
        },
        /**
         * Assign previous branch instance to show the map config on the server.
         * 
         * @return {OdooClass.Branch} Return previous branch instance for MapConfig.
         */
        prevBranch: function() {
            var self = this;
            self.current_branch_index = self.current_branch_index - 1;
            if (self.current_branch_index < 0)
                self.current_branch_index = self.branches.length - 1;
            return self.branches[self.current_branch_index];
        },
        /**
         * Return current branch instance to show the map config on the server.
         * @return {OdooClass.Branch} Return current branch instance for MapConfig.
         */
        getCurrentBranch: function() {
            var self = this;
            if (self.branches.length > 0) {
                if (self.current_branch_index == -1)
                    self.current_branch_index = 0;
                return this.branches[this.current_branch_index];
            } else {
                return false;
            }
        },
        /**
         * Fetch the default fields for the map config on the server.
         * @return {jQuery.Deferred} Resolves to the udpate MapConfig.
         */
        fetchMapConfigInfo: function() {
            var self = this;
            return rpc.query({
                'route': '/website_branch_map/get_map_config',
                params: {
                    id: this.id,
                },
                // kwargs: { fields: ['id', 'type', 'zoom'] }
            }).then(function(map_values) {
                Object.assign(self, map_values[0]);
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
        fetchAllBranches: function() {
            var self = this;
            return rpc.query({
                'route': '/website_branch_map/get_branch_locations',
                params: {},
            }).then(function(branch_values) {
                for (var vals of branch_values) {
                    self.branches.push(new Branch(vals));
                }
                return self;
            });
        },
        /**
         * Fetch a specified branch id for the current MapConfig.
         * @param  {Integer} id ID of the branch to fetch.
         * @return {jQuery.Deferred} Resolves to the new Branch
         */
        fetchBranch: function(id) {
            var self = this;
            return rpc.query({
                'route': '/website_branch_map/get_branch_locations',
                params: {
                    id: id,
                },
            }).then(function(branch_values) {
                if (branch_values.length) {
                    var branch = new Branch(branch_values[0]);
                    var t_idx = self.branches.findIndex(t => t.id === id);
                    if (t_idx !== -1) {
                        self.branches.splice(t_idx, 1, branch);
                    } else {
                        self.branches.push(branch);
                    }
                }
                return branch;
            });
        },
        /**
         * Remove a specified branch id from the collections.
         * @param  {Integer} id ID of the branch to remove
         */
        removeBranch: function(id) {
            var self = this;
            var t_idx = self.branches.findIndex(t => t.id === id);
            if (t_idx !== -1) {
                console.log("t_ids: " + t_idx);
                console.log("length: " + self.branches.length);
                console.log("currentBranch: " + self.current_branch_index);
                self.branches.splice(t_idx, 1);

                // Check if the current branch was the last one
                // And reset the current index if it is the last one
                if (t_idx > (self.branches.length - 1))
                    self.current_branch_index = 0;

                // Check if the branches are empty
                // If so, set current index to -1
                if (self.branches.length <= 0)
                    self.current_branch_index = -1;
                console.log(self.current_branch_index);
            }
        },
    });

    return {
        Branch: Branch,
        MapConfig: MapConfig,
    };
});