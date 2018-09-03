/* Copyright 2018 Susan K.C.
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('website_footer_sticky.frontend', function(require) {
    "use strict";

    var base = require('web_editor.base');

    base.ready().then(function() {
        var footer = $('footer');
        var footer_nav = $(footer).find(".footer");
        if ($(footer_nav).length) {
            if (footer_nav.attr('data-do-stick') === '1') {
                var footer_nav_clone = footer_nav.clone();
                footer_nav_clone.addClass('div-fixed-bottom');
                footer.append(footer_nav_clone);
            }
        }

        var footer_mobile_nav = $(footer).find("nav.navbar")
        if ($(footer_mobile_nav).length) {
            if (footer_mobile_nav.attr('data-do-stick') === '1') {
                var footer_mobile_navclone = footer_mobile_nav.clone();
                footer_mobile_navclone.addClass('footer-nav-sticky');
                footer.append(footer_mobile_navclone);
            }
        }
    });
});