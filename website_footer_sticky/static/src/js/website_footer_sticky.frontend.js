/* Copyright 2018 Susan K.C.
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('website_footer_sticky.frontend', function(require) {
    "use strict";

    var base = require('web_editor.base');

    base.ready().then(function() {
        var footer = $('footer');
        var div = $("div.footer");
        if (div.attr('data-do-stick') === '1') {
            var div_clone = div.clone();
            div_clone.addClass('div-fixed-bottom');
            footer.append(div_clone);
        }
    });
});