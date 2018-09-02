odoo.define('website_branch_map.init', function(require) {
    "use strict";

    var rpc = require('web.rpc');

    //default key
    var default_key = 'AIzaSyAu47j0jBPU_4FmzkjA3xc_EKoOISrAJpI';

    // if (!$('.o_branch_location_app').length) {
    //     return $.Deferred().reject("DOM doesn't contain '.o_branch_location_app'");
    // }
    rpc.query({
        'route': '/website_branch_map/get_api_key',
        params: {},
    }).then(function(key) {
        if (!key) {
            key = default_key;
        }
        $.getScript('http://maps.googleapis.com/maps/api/js?key=' + key + '&libraries=places');
    });
});