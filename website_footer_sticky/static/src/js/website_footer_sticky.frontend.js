/* Copyright 2018 Susan K.C.
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('website_footer_sticky.frontend', function(require) {
    "use strict";

    var base = require('web_editor.base');
	console.log("La JS ma aayo hai!!!!!!!!!!!!!")
	
    base.ready().then(function() {
		console.log("La Function ma aayo hai!!!!!!!!!!!!!")
        var footer = $('footer');
        var div = $("div.footer");
		console.log(footer);
		console.log(div);
        if (div.attr('data-do-stick') === '1') {
			console.log("La IF CONDITION ma aayo hai!!!!!!!!!!!!! 1")
            var div_clone = div.clone();
            div_clone.addClass('div-fixed-bottom');
            footer.append(div_clone);
        }
    });
});