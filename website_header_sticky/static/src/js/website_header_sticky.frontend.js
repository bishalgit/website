/* Copyright 2018 Bishal Pun
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('website_header_sticky.frontend', function(require) {
    "use strict";

    var base = require('web_editor.base');

    base.ready().then(function() {
        var header = $('header');
        var navbar = $('header > .navbar');

        if (navbar.attr('data-do-stick') === '1') {
            var navbar_clone = navbar.clone();
            navbar_clone.addClass('navbar-fixed-top');
            header.append(navbar_clone);
        }
        if(!$('#oe_main_menu_navbar').length){
            $(".navbar-fixed-top").each(function () {
                $(this).css("top", "0px");
            });
            $(".o_connected_user").css("cssText","padding-top: 0px !important");
        }
    });
});