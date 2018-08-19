odoo.define('website_cart_sidebar.views', function(require) {
    'use strict';

    var bus = require('bus.bus').bus;
    var core = require('web.core');
    var Dialog = require('web.Dialog');
    var CartConfig = require('website_cart_sidebar.classes').CartConfig;
    var Widget = require('web.Widget');

    var qweb = core.qweb;
    var _t = core._t;

    require('web.dom_ready');

    var OrderApp = Widget.extend({
        // template: 'website_cart_sidebar.app',
        xmlDependencies: ['/website_cart_sidebar/static/src/xml/product_views.xml'],
        /* Lifecycle */
        init: function(parent, options) {
            this._super.apply(this, arguments);
            this.cartConfig = new CartConfig({ id: odoo.csrf_token });
        },
        willStart: function() {
            return $.when(this._super.apply(this, arguments)).then(function() {
                bus.update_option('product.product', '1');
            });
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {

                // Create and append branch list
                var product_modal_node = qweb.render('website_cart_sidebar.product_modal');
                var cart_modal_node = qweb.render('website_cart_sidebar.cart_modal');
                $('body').append(cart_modal_node);
                $('body').append(product_modal_node);
                self.cartModal = $('#cartModal');
                self.productModal = $('#productModal');
                self.$el.parent().find(".oe_add_to_cart_button").each(function() {
                    $(this).on("click", _.bind(self._showProductModal, self));
                });
                // self.notification_manager = new notification.NotificationManager(self);
                // self.notification_manager.appendTo(self.$el);

                // Register events in bus
                bus.on('notification', self, self._onNotification);
            });
        },
        /**
         * Check the cache for the product or fetch the product from
         * the server. 
         * Show the product modal after retrieving the product with
         * given id.
         * @param {Event}
         * @returns {}
         */
        _showProductModal: function(event) {
            var self = this;

            /**
             * event.currentTarget will contain the element that actually
             * has the event listener.
             * event.target will be the clicked element.
             */
            var product_id = parseInt($(event.currentTarget).data("product-id"));

            /**
             * Return if the product_id is NaN
             */
            if (product_id !== product_id)
                return;

            // Search the product in cache
            var product = this.cartConfig.searchProduct(product_id);
            if (product == null) {
                // Fetch the product from the server
                this.cartConfig.fetchProduct(product_id).then(function(prod) {
                    if (prod != null) {
                        product = prod;
                        self._appendProductModal(product);
                    }
                });
            } else {
                self._appendProductModal(product);
            }
        },
        _appendProductModal: function(product) {
            console.log(product);
            var product_content = qweb.render('website_cart_sidebar.product', { widget: product });
            var addons_categ_changed = false;
            var addons_current_categ_id = -1;
            var oe_additions = document.createElement("div");
            product.additions.forEach(addition => {
                addons_categ_changed = (addons_current_categ_id != addition.public_categs[0].id) ? true : false;
                var addition_content = null;
                if (addons_categ_changed && $(oe_additions).find("ul[data-addition-categ-id='" + addition.public_categs[0].id + "']").length == 0) {
                    addons_categ_changed = false;
                    addons_current_categ_id = addition.public_categs[0].id;
                    if (addition.is_multiple) {
                        addition_content = qweb.render('website_cart_sidebar.additon.multi', { addition: addition });
                    } else {
                        addition_content = qweb.render('website_cart_sidebar.additon.single', { addition: addition });
                    }
                    var addons_ul = qweb.render('website_cart_sidebar.addition.categ', { categ: addition.public_categs[0] });
                    $(oe_additions).append(addons_ul);
                } else {
                    addons_current_categ_id = addition.public_categs[0].id;
                    if (addition.is_multiple) {
                        addition_content = qweb.render('website_cart_sidebar.additon.multi', { addition: addition });
                    } else {
                        addition_content = qweb.render('website_cart_sidebar.additon.single', { addition: addition });
                    }
                }

                $(oe_additions).find("ul[data-addition-categ-ul-id='" + addons_current_categ_id + "']").append(addition_content);
            });
            // Header and Footer
            $(this.productModal).find("#productModalTitle").text("Customize " + product.display_name);
            $(this.productModal).find('#productCartTotalAmount').text(product.website_public_price);

            // Body
            $(this.productModal).find("section[data-id='productModal']").empty();
            $(this.productModal).find("section[data-id='productModal']").append(product_content);

            // Additions
            $(this.productModal).find("#oe_additions").empty();
            $(this.productModal).find("#oe_additions").append(oe_additions);

            this._bindAddCartAddition();

            $(this.productModal).modal("show");
        },
        _bindAddCartAddition: function() {
            var self = this;
            var oe_additions = $(this.productModal).find("#oe_additions");
            // hack to add and remove from cart with json
            $(oe_additions).on('click', 'a.js_add_cart_json', function(ev) {
                ev.preventDefault();
                var $link = $(ev.currentTarget);
                var $input = $link.parent().find("input");
                var min = parseFloat($input.data("min") || 0);
                var max = parseFloat($input.data("max") || Infinity);
                var minus_plus = ($link.has(".fa-minus").length ? -1 : 1);
                var quantity = minus_plus + parseFloat($input.val() || 0, 10);
                var current_total = parseFloat($(self.productModal).find('#productCartTotalAmount').text());
                if (quantity >= min && quantity <= max) {
                    console.log(current_total);
                    current_total = minus_plus * parseFloat($input.attr("data-price")) + current_total;
                }
                console.log("lskdj");
                var new_qty = quantity > min ? (quantity < max ? quantity : max) : min;
                $input.val(new_qty).change();
                $(self.productModal).find('#productCartTotalAmount').text(current_total);
                return false;
            });
            $(oe_additions).on('change', 'input.js_add_cart_json', function(ev) {
                ev.preventDefault();
                var $input = $(ev.currentTarget);
                var current_total = parseFloat($(self.productModal).find('#productCartTotalAmount').text());
                var minus_plus = -1;
                if (this.checked) {
                    minus_plus = 1;
                }

                current_total = minus_plus * parseFloat($input.attr("data-price")) + current_total;
                $(self.productModal).find('#productCartTotalAmount').text(current_total);
                return false;
            });
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
                if (channel[1] !== 'product.product') {
                    return;
                }
                if (message[0] === 'new_product') {
                    var product_id = message[1];
                    if (!this.cartConfig.products.find(t => t.id === product_id)) {
                        this.cartConfig.fetchProduct(product_id).then(function(new_product) {
                            // Insert the product in DOM
                        });
                    }
                } else if (message[0] === 'update_product') {
                    var product_id = message[1];
                    if (this.cartConfig.products.find(t => t.id === product_id)) {
                        this.cartConfig.fetchProduct(product_id).then(function(update_product) {
                            // Update the product in DOM
                        });
                    }
                } else if (message[0] === 'unlink_product') {
                    self.cartConfig.removeProduct(message[1]);
                }
            }
        },
    });

    var $elem = $('.oe_order_app');
    var app = new OrderApp(null);
    app.appendTo($elem).then(function() {
        bus.start_polling();
    });
});