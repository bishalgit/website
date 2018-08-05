/*
 * @Author: Bishal Pun
 * @Email: bishalpun2013@gmail.com
 */
odoo.define('website_branch_map.map_widget', function(require) {
    var Widget = require('web.Widget');

    var MapWidget = Widget.extend({
        template: 'google_map',
        init: function(parent) {
            this.parent = parent || {};
            this._super(parent);
            // default location
            this.branches = parent.mapConfig.branches;
            this.branch = parent.swap.getBranch();
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

            this.map = new google.maps.Map(self.$el.filter('.gmap-container')[0], mapOptions);

            this.addMarkers();
        },
        addMarkers: function() {
            var self = this;
            var image = {
                url: '/website_branch_map/static/src/img/hdpi/spotlight_poi_black_dot_green_hdpi.png',
                // The anchor for this image is the base of the flagpole at (0, 43).
                anchor: new google.maps.Point(0, 43),
                // label origin
                labelOrigin: new google.maps.Point(30, 50),
                // The origin for this image is (0, 0).
                origin: new google.maps.Point(0, 0),
                // scaledSize
                scaledSize: new google.maps.Size(27, 43),
                // This marker is 27 pixels wide by 43 pixels high.
                size: new google.maps.Size(27, 43)
            };

            for (let i = 0; i < self.branches.length; i++) {
                var latlng = new google.maps.LatLng(self.branches[i].lat, self.branches[i].lng);
                var label = {
                    color: '#ea4335',
                    fontSize: '16px',
                    fontWeight: 'bolder',
                    text: self.branches[i].name
                };
                self.branches[i].marker = new google.maps.Marker({
                    position: latlng,
                    map: self.map,
                    animation: google.maps.Animation.DROP,
                    // title: self.branches[i].name,
                    icon: image,
                    label: label
                });
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