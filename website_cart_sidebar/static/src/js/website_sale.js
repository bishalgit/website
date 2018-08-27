odoo.define('website_cart_sidebar.cart', function(require) {
    "use strict";

    require('web.dom_ready');
    var core = require('web.core');
    var _t = core._t;

    // setTimeout(() => {
    //     $('ul.top_menu_custom').each(function() {
    //         var shopping_cart_link = $(this).find('li a[data-href$="/shop/cart"]');
    //         var shopping_cart_link_counter;
    //         var cartModal = $('#cartModal');
    //         shopping_cart_link.on("click", function() {
    //             var self = this;
    //             clearTimeout(shopping_cart_link_counter);
    //             $(cartModal).modal('hide');
    //             shopping_cart_link_counter = setTimeout(function() {
    //                 $(cartModal).find(".modal-body").empty();
    //                 $(cartModal).modal("show");
    //                 $.get("/shop/cart/modal", { 'type': 'modal' })
    //                     .then(function(data) {
    //                         $(cartModal).find(".modal-body").append(data);
    //                         $(cartModal).on("mouseleave", function() {
    //                             $(self).trigger('mouseleave');
    //                         });
    //                     });
    //             }, 100);
    //         }).on("mouseleave", function() {
    //             var self = this;
    //             setTimeout(function() {
    //                 if (!$(".modal:hover").length) {
    //                     if (!$(cartModal).is(':hover')) {
    //                         $(cartModal).modal('hide');
    //                     }
    //                 }
    //             }, 100000);
    //         });
    //     });
    // }, 1000);
});

odoo.define('website_cart_sidebar.website_sale', function(require) {
    "use strict";

    require('web.dom_ready');
    var base = require("web_editor.base");
    var ajax = require('web.ajax');
    var utils = require('web.utils');
    var core = require('web.core');
    var config = require('web.config');
    require("website.content.zoomodoo");
    var _t = core._t;

    if (!$('.oe_website_sale').length) {
        return $.Deferred().reject("DOM doesn't contain '.oe_website_sale'");
    }

    $('.oe_website_sale').each(function() {
        var oe_website_sale = this;

        var clickwatch = (function() {
            var timer = 0;
            return function(callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })();

        $('.oe_cart').on('click', '.js_delete_product_modal', function(e) {
            e.preventDefault();
            $(this).closest('div.food-order-item').find('.js_quantity').val(0).trigger('change');
            var cartModal = $('#cartModal')
            setTimeout(function() {
                $.get("/shop/cart/modal", { 'type': 'modal' })
                    .then(function(data) {
                        $(cartModal).find(".modal-body").empty();
                        $(cartModal).find(".modal-body").append(data);
                        $(cartModal).on("mouseleave", function() {
                            $(self).trigger('mouseleave');
                        });
                    });
            }, 300);
        });
    });
});