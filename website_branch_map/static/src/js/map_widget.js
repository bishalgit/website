/*
 * @Author: Bishal Pun
 * @Email: bishalpun2013@gmail.com
 */
odoo.define('website_branch_map.map_widget', function(require) {
    var core = require('web.core');
    var Widget = require('web.Widget');

    var MapWidget = Widget.extend({
        template: 'google_map',
        init: function(parent) {
            this.parent = parent || {};
            this._super(parent);
            // default location
            this.branches = parent.mapConfig.branches.slice();
            this.branch = parent.swap.getBranch();
            this.markerIcons = {};
            this.markerIcons.primary = {
                url: '/website_branch_map/static/src/img/hdpi/spotlight_poi_black_dot_green_hdpi.png',
                // The anchor for this image is the base of the flagpole at (0, 43).
                anchor: new google.maps.Point(0, 43),
                // label origin
                labelOrigin: new google.maps.Point(15, 55),
                // The origin for this image is (0, 0).
                origin: new google.maps.Point(0, 0),
                // scaledSize
                scaledSize: new google.maps.Size(27, 43),
                // This marker is 27 pixels wide by 43 pixels high.
                size: new google.maps.Size(27, 43)
            };
            this.markerIcons.secondary = {
                url: '/website_branch_map/static/src/img/hdpi/spotlight_poi_black_dot_white_hdpi.png',
                // The anchor for this image is the base of the flagpole at (0, 43).
                anchor: new google.maps.Point(0, 21.5),
                // label origin
                labelOrigin: new google.maps.Point(15, 30),
                // The origin for this image is (0, 0).
                origin: new google.maps.Point(0, 0),
                // scaledSize
                scaledSize: new google.maps.Size(15.1, 24),
                // This marker is 13.5 pixels wide by 21.5 pixels high.
                size: new google.maps.Size(15.1, 24)
            };
            this.primaryColor = "#ea4335";
            this.secondaryColor = "#060708";
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {
                self._onReady();
            });
        },
        /**
         * Set google map and set plot branches in map
         */
        _onReady: function() {
            var self = this;

            if (!this.$el) {
                return;
            }

            // $(self.$el.filter('.map-toggle')[0]).click(function() {
            //     $(self.$el.filter('.gmap-container')[0]).toggle();
            //     self.update_marker(self.lat, self.lng);
            // });

            // default latLng
            var latLng = new google.maps.LatLng(self.branch.lat, self.branch.lng);

            var mapOptions = {
                zoom: 15,
                center: latLng
            };

            self.map = new google.maps.Map(self.$el.filter('.gmap-container')[0], mapOptions);

            self.addAllMarkers();
        },
        /**
         * Swap marker instance.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        swapMarker: function(branch, isNew = false) {
            var self = this;

            self.clearMarkers();
            var t_idx = self.branches.findIndex(t => t.id === branch.id);
            if (t_idx !== -1) {
                var marker = self.branches[t_idx].marker;
                self.branches.splice(t_idx, 1, branch);
                self.branches[t_idx].marker = marker;
            } else {
                self.branches.push(branch);
            }
            if (!isNew)
                self.branch = branch;
            self.addAllMarkers();
            self.showMarkers(self.map);
        },
        addAllMarkers: function() {
            var self = this;

            for (let i = 0; i < self.branches.length; i++) {
                var latlng = new google.maps.LatLng(self.branches[i].lat, self.branches[i].lng);
                if (self.branches[i].id != self.branch.id) {
                    var label = self.createLabel(self.secondaryColor, '13px', 'normal', self.branches[i].name);
                    self.branches[i].marker = self.createMarker(latlng, label, self.markerIcons.secondary);
                } else {
                    var label = self.createLabel(self.primaryColor, '14px', 'normal', self.branches[i].name);
                    self.branches[i].marker = self.createMarker(latlng, label, self.markerIcons.primary);
                }
                google.maps.event.addListener(self.branches[i].marker, 'click', function() {
                    self.swapMarker(self.branches[i]);
                    core.bus.trigger('onMarkerSwap', self.branches[i]);
                });
            }
            self.setCenter();
        },
        setCenter: function() {
            var latlng = new google.maps.LatLng(this.branch.lat, this.branch.lng);
            google.maps.event.trigger(this.map, 'resize');
            this.map.setCenter(latlng);
        },
        createLabel: function(color, fontSize, fontWeight, text) {
            return {
                color: color,
                fontSize: fontSize,
                fontWeight: fontWeight,
                text: text
            };
        },
        createMarker: function(latlng, label, icon) {
            var marker = new google.maps.Marker({
                position: latlng,
                map: this.map,
                animation: google.maps.Animation.DROP,
                // title: self.branches[i].name,
                icon: icon,
                label: label
            });
            return marker;
        },
        // Sets the map on a marker in the array.
        setMapOnAll: function(map) {
            for (var i = 0; i < this.branches.length; i++) {
                if (map != null)
                    this.branches[i].marker.setMap(this.map);
                else
                    this.branches[i].marker.setMap(map);
            }
        },

        // Removes a marker from the map, but keeps it in the array.
        clearMarkers: function() {
            this.setMapOnAll(null);
        },

        // Shows any markers currently in the array.
        showMarkers: function() {
            this.setMapOnAll(this.map);
        },

        // Deletes all markers in the array by removing references to them.
        deleteMarkers: function() {
            this.clearMarkers();
        },
        /**
         * Remove a branch from the list. If this is the last branch to be
         * removed, rerender the widget completely to reflect the 'empty list'
         * state.
         * @param  {Integer} id ID of the branch to remove.
         */
        removeBranch: function(id) {
            var t_idx = this.branches.findIndex(t => t.id === id);
            if (t_idx !== -1) {
                this.branches[t_idx].marker.setMap(null);
                this.branches.splice(t_idx, 1);
            }
        },
        /**
         * Update an existing branch instance in the list.
         * @param  {OdooClass.Branch} branch Branch to update in the list
         */
        updateMarker: function(branch) {
            var t_idx = this.branches.findIndex(t => t.id === branch.id);
            if (t_idx !== -1) {
                this.clearMarkers();
                this.branches.splice(t_idx, 1, branch);
                this.addAllMarkers();
                this.showMarkers(self.map);
            }
        },
        update_marker: function(lat, lng) {
            this.lat = lat;
            this.lng = lng;
            var latLng = new google.maps.LatLng(lat, lng);
            this.map.setCenter(latLng);
            this.marker.setPosition(latLng);
            google.maps.event.trigger(this.map, 'resize');
        }
    });

    return MapWidget;
});