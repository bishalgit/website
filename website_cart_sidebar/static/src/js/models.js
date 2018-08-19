odoo.define('website_cart_sidebar.classes', function(require) {
    'use strict';

    var Class = require('web.Class');
    var rpc = require('web.rpc');

    /**
     * Branches
     * Represents a branch.location object from the Backend
     * @type {OdooClass}
     */
    var Product = Class.extend({
        init: function(values) {
            Object.assign(this, values.product[0]);
            this.additions = values.additions;
            this.categories = values.categories;
            this.pricelist = values.pricelist;
        },
        /**
         * Fetch the latest fields for this particular branch
         * on the backend server
         * @return {jQuery.Deferred} Resolves to the updated
         *                           Branch if successful.
         */
        update: function() {
            var self = this;
            return rpc.query({
                'route': '/website_cart_sidebar/product',
                params: {
                    id: this.id,
                },
            }).then(function(branch_values) {
                Object.assign(self, branch_values[0]);
                return self;
            });
        },
    });


    /**
     * Cart
     * Represents a website_sale.cart from the Backend, accessible by default.
     * The Cart class also represents a Product collection.
     * @type {OdooClass}
     */
    var CartConfig = Class.extend({
        init: function(values) {
            Object.assign(this, values);
            this.products = [];
        },
        /**
         * Search product if it exists in the list.
         * Return the product if it exists else return null.
         * The product list will be maintained by notification channel.
         * @param  {Integer} id ID of the product to search.
         * @return {Product}
         */
        searchProduct: function(id) {
            // search a product with the given id in the list
            // Return the product if it exists in the list and null
            // if it doesn't.
            var t_idx = this.products.findIndex(t => t.id === id);
            if (t_idx !== -1) {
                return this.products[t_idx];
            }

            return null;
        },
        /**
         * Fetch product with given id from the server, push the product into the list, 
         * and return the product.
         * The product list will be maintained by notification channel.
         * @param  {Integer} id ID of the branch to fetch.
         * @return {jQuery.Deferred} Resolves to the new Branch
         */
        fetchProduct: function(id) {
            var self = this;
            return rpc.query({
                'route': '/website_cart_sidebar/product',
                params: {
                    id: id,
                },
            }).then(function(product_values) {
                var product = null;
                console.log(product_values);
                if (product_values) {
                    product = new Product(product_values);
                    var t_idx = self.products.findIndex(t => t.id === id);
                    if (t_idx !== -1) {
                        self.products.splice(t_idx, 1, product);
                    } else {
                        self.products.push(product);
                    }
                }
                return product;
            });
        },
        /**
         * Remove a specified product id from the collections.
         * @param  {Integer} id ID of the product to remove
         */
        removeProduct: function(id) {
            var self = this;
            var t_idx = self.products.findIndex(t => t.id === id);
            if (t_idx !== -1) {
                self.products.splice(t_idx, 1);
            }
        },
    });

    return {
        Product: Product,
        CartConfig: CartConfig,
    };
});