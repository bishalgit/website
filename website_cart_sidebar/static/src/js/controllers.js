odoo.define('website_cart_sidebar.views', function(require) {
    'use strict';

    require('web.dom_ready');
    var bus = require('bus.bus').bus;
    var ajax = require('web.ajax');
    var utils = require('web.utils');
    var core = require('web.core');
    var Dialog = require('web.Dialog');
    var CartConfig = require('website_cart_sidebar.classes').CartConfig;
    var Widget = require('web.Widget');
    require("website.content.zoomodoo");

    var qweb = core.qweb;
    var _t = core._t;

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
                // var cart_modal_node = qweb.render('website_cart_sidebar.cart_modal');
                self.cartModal = new CartModal(this, "cartModal");
                // $('body').append(cart_modal_node);
                self.cartModal.appendTo($('body')).then(function() {
                    console.log("cart modal widget appended.");
                });
                $('body').append(product_modal_node);
                // self.cartModal = $('#cartModal');
                self.productModal = $('#productModal');

                // Bind events for product modal elements
                $(self.productModal).on('click', '.a-submit', function(event) {
                    if (!event.isDefaultPrevented() && !$(this).is(".disabled")) {
                        event.preventDefault();
                        $(this).closest('form').submit();
                    }
                    if ($(this).hasClass('a-submit-disable')) {
                        $(this).addClass("disabled");
                    }
                    if ($(this).hasClass('a-submit-loading')) {
                        var loading = '<span class="fa fa-cog fa-spin"/>';
                        var fa_span = $(this).find('span[class*="fa"]');
                        if (fa_span.length) {
                            fa_span.replaceWith(loading);
                        } else {
                            $(this).append(loading);
                        }
                    }
                });

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
            // console.log(product);
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

            // Total Price
            $(this.productModal).find('#productCartTotalAmount').text(product.website_public_price);

            // Body
            $(this.productModal).find("section[data-id='productModal']").empty();
            $(this.productModal).find("section[data-id='productModal']").append(product_content);

            // Additions
            $(this.productModal).find("#oe_additions").empty();
            $(this.productModal).find("#oe_additions").append(oe_additions);

            // Bind events
            this._bindAddCartAddition();

            // Assign product price
            // $(this.productModal).find('#product_qty').find('input').attr('data-price', product.website_public_price);

            // Show Product Modal
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
                    current_total = minus_plus * parseFloat($input.attr("data-price")) + current_total;
                }
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

    var CartModal = Widget.extend({
        template: 'website_cart_sidebar.cart_modal',
        xmlDependencies: ['/website_cart_sidebar/static/src/xml/product_views.xml'],
        /* Lifecycle */
        init: function(parent, nodeId) {
            this._super.apply(this, arguments);
            this.nodeId = nodeId;
        },
        willStart: function() {
            return $.when(this._super.apply(this, arguments));
        },
        start: function() {
            var self = this;
            return this._super.apply(this, arguments).then(function() {
                /**
                 * Check if top navbar has loaded completely
                 * If yes then bind events for cart modal elements
                 */
                self.t = setInterval(function() {
                    self._onReady();
                }, 1000);
            });
        },
        /**
         * 
         */
        _onReady: function() {
            var self = this;

            if (self.t) {
                clearInterval(self.t);
            }

            $('a.oe_my_cart_link').each(function() {
                var shopping_cart_link_counter;
                var cartModal = self.$el;
                $(this).on("click", function() {
                    var selfModal = this;
                    clearTimeout(shopping_cart_link_counter);
                    $(cartModal).modal('hide');
                    shopping_cart_link_counter = setTimeout(function() {
                        $(cartModal).find(".modal-body").empty();
                        $(cartModal).modal("show");
                        $.get("/shop/cart/modal", { 'type': 'modal' })
                            .then(function(data) {
                                $(cartModal).find(".modal-body").append(data);
                                $(cartModal).on("mouseleave", function() {
                                    $(selfModal).trigger('mouseleave');
                                });
                                self._bindAllEvents();
                            });
                    }, 100);
                }).on("mouseleave", function() {
                    var selfModal = this;
                    setTimeout(function() {
                        if (!$(".modal:hover").length) {
                            if (!$(cartModal).is(':hover')) {
                                $(cartModal).modal('hide');
                            }
                        }
                    }, 100000);
                });
            });
        },
        _bindAllEvents: function() {
            var self = this;

            var clickwatch = (function() {
                var timer = 0;
                return function(callback, ms) {
                    clearTimeout(timer);
                    timer = setTimeout(callback, ms);
                };
            })();
            $(this.$el).off('change', '.oe_cart input.js_quantity[data-product-id]').on('change', '.oe_cart input.js_quantity[data-product-id]', function() {
                var $input = $(this);
                if ($input.data('update_change')) {
                    return;
                }
                var value = parseInt($input.val() || 0, 10);
                if (isNaN(value)) {
                    value = 1;
                }
                var $dom = $(this).closest('tr');
                //var default_price = parseFloat($dom.find('.text-danger > span.oe_currency_value').text());
                var $dom_optional = $dom.nextUntil(':not(.optional_product.info)');
                var line_id = parseInt($input.data('line-id'), 10);
                var product_ids = [parseInt($input.data('product-id'), 10)];
                clickwatch(function() {
                    $dom_optional.each(function() {
                        $(this).find('.js_quantity').text(value);
                        product_ids.push($(this).find('span[data-product-id]').data('product-id'));
                    });
                    $input.data('update_change', true);

                    ajax.jsonRpc("/shop/cart/update_json", 'call', {
                        'line_id': line_id,
                        'product_id': parseInt($input.data('product-id'), 10),
                        'set_qty': value
                    }).then(function(data) {
                        $input.data('update_change', false);
                        var check_value = parseInt($input.val() || 0, 10);
                        if (isNaN(check_value)) {
                            check_value = 1;
                        }
                        if (value !== check_value) {
                            $input.trigger('change');
                            return;
                        }
                        var $q = $(".my_cart_quantity");
                        if (data.cart_quantity) {
                            $q.parents('li:first').removeClass("hidden");
                        } else {
                            $q.parents('li:first').addClass("hidden");
                            $('a[href*="/shop/checkout"]').addClass("hidden");
                        }

                        $q.html(data.cart_quantity).hide().fadeIn(600);
                        $input.val(data.quantity);
                        $('.js_quantity[data-line-id=' + line_id + ']').val(data.quantity).html(data.quantity);

                        // Refresh sidebar cart modal
                        // TODO: Optimize memory
                        $.get("/shop/cart/modal", { 'type': 'modal' })
                            .then(function(data) {
                                $(self.$el).find("div.modal-body").empty().append(data);
                                // self._bindAllEvents();
                            });

                        $(".js_cart_lines").first().before(data['website_sale.cart_lines']).end().remove();

                        if (data.warning) {
                            var cart_alert = $('.oe_cart').parent().find('#data_warning');
                            if (cart_alert.length === 0) {
                                $('.oe_cart').prepend('<div class="alert alert-danger alert-dismissable" role="alert" id="data_warning">' +
                                    '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button> ' + data.warning + '</div>');
                            } else {
                                cart_alert.html('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button> ' + data.warning);
                            }
                            $input.val(data.quantity);
                        }
                    });
                }, 500);
            });

            // hack to add and remove from cart with json
            $(this.$el).off('click', 'a.js_add_cart_json').on('click', 'a.js_add_cart_json', function(ev) {
                ev.preventDefault();
                var $link = $(ev.currentTarget);
                var $input = $link.parent().find("input");
                var product_id = +$input.closest('*:has(input[name="product_id"])').find('input[name="product_id"]').val();
                var min = parseFloat($input.data("min") || 0);
                var max = parseFloat($input.data("max") || Infinity);
                var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val() || 0, 10);
                var new_qty = quantity > min ? (quantity < max ? quantity : max) : min;
                // if they are more of one input for this product (eg: option modal)
                $('input[name="' + $input.attr("name") + '"]').add($input).filter(function() {
                    var $prod = $(this).closest('*:has(input[name="product_id"])');
                    return !$prod.length || +$prod.find('input[name="product_id"]').val() === product_id;
                }).val(new_qty).change();
                return false;
            });

            $(this.$el).off('click', '.js_delete_product_modal').on('click', '.js_delete_product_modal', function(e) {
                e.preventDefault();
                $(this).closest('div.oe-cart-sidebar-modal-product').find('.js_quantity').val(0).trigger('change');
            });
        },
    });

    var $elem = $('.oe_order_app');
    var app = new OrderApp(null);
    app.appendTo($elem).then(function() {
        bus.start_polling();
    });
});