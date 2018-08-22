# -*- coding: utf-8 -*-

import json
import logging
from werkzeug.exceptions import Forbidden, NotFound

from odoo import http, tools, _
from odoo.addons.bus.controllers.main import BusController
from odoo.http import request, route
from odoo.addons.base.ir.ir_qweb.fields import nl2br
from odoo.addons.http_routing.models.ir_http import slug
from odoo.addons.website.controllers.main import QueryURL
from odoo.exceptions import ValidationError
from odoo.addons.website.controllers.main import Website
from odoo.addons.website_form.controllers.main import WebsiteForm
from odoo.addons.website_sale.controllers.main import TableCompute, WebsiteSale
from odoo.osv import expression

_logger = logging.getLogger(__name__)

PPG = 20  # Products Per Page
PPR = 4  # Products Per Row


class WebsiteSaleCart(WebsiteSale):
    @http.route(['/shop/cart/modal'], type='http', auth="public", website=True)
    def cartModal(self, access_token=None, revive='', **post):
        """
        Main cart management + abandoned cart revival
        access_token: Abandoned cart SO access token
        revive: Revival method when abandoned cart. Can be 'merge' or 'squash'
        """
        order = request.website.sale_get_order()
        values = {}
        if access_token:
            abandoned_order = request.env['sale.order'].sudo().search([('access_token', '=', access_token)], limit=1)
            if not abandoned_order:  # wrong token (or SO has been deleted)
                return request.render('website.404')
            if abandoned_order.state != 'draft':  # abandoned cart already finished
                values.update({'abandoned_proceed': True})
            elif revive == 'squash' or (revive == 'merge' and not request.session['sale_order_id']):  # restore old cart or merge with unexistant
                request.session['sale_order_id'] = abandoned_order.id
                return request.redirect('/shop/cart')
            elif revive == 'merge':
                abandoned_order.order_line.write({'order_id': request.session['sale_order_id']})
                abandoned_order.action_cancel()
            elif abandoned_order.id != request.session['sale_order_id']:  # abandoned cart found, user have to choose what to do
                values.update({'access_token': abandoned_order.access_token})

        if order:
            from_currency = order.company_id.currency_id
            to_currency = order.pricelist_id.currency_id
            compute_currency = lambda price: from_currency.compute(price, to_currency)
        else:
            compute_currency = lambda price: price

        values.update({
            'website_sale_order': order,
            'compute_currency': compute_currency,
            'suggested_products': [],
        })
        if order:
            _order = order
            if not request.env.context.get('pricelist'):
                _order = order.with_context(pricelist=order.pricelist_id.id)
            values['suggested_products'] = _order._cart_accessories()

        if post.get('type') == 'modal':
            # force no-cache so IE11 doesn't cache this XHR
            return request.render("website_cart_sidebar.cart_modal", values, headers={'Cache-Control': 'no-cache'})

        return request.render("website_sale.cart", values)

    @http.route([
        '/shop',
        '/order',
        '/order/page/<int:page>',
        '/order/category/<model("product.public.category"):category>',
        '/order/category/<model("product.public.category"):category>/page/<int:page>'
    ], type='http', auth="public", website=True)
    def orderOnline(self, page=0, category=None, search='', ppg=False, **post):
        if ppg:
            try:
                ppg = int(ppg)
            except ValueError:
                ppg = PPG
            post["ppg"] = ppg
        else:
            ppg = PPG

        if category:
            category = request.env['product.public.category'].search([('id', '=', int(category))], limit=1)
            if not category:
                raise NotFound()

        attrib_list = request.httprequest.args.getlist('attrib')
        attrib_values = [[int(x) for x in v.split("-")] for v in attrib_list if v]
        attributes_ids = {v[0] for v in attrib_values}
        attrib_set = {v[1] for v in attrib_values}

        domain = self._get_search_domain(search, category, attrib_values)

        keep = QueryURL('/shop', category=category and int(category), search=search, attrib=attrib_list,
                        order=post.get('order'))

        compute_currency, pricelist_context, pricelist = self._get_compute_currency_and_context()

        request.context = dict(request.context, pricelist=pricelist.id, partner=request.env.user.partner_id)

        url = "/shop"
        if search:
            post["search"] = search
        if attrib_list:
            post['attrib'] = attrib_list

        categs = request.env['product.public.category'].search([('order', '=', 1)])
        Product = request.env['product.template']

        parent_category_ids = []
        if category:
            url = "/shop/category/%s" % slug(category)
            parent_category_ids = [category.id]
            current_category = category
            while current_category.parent_id:
                parent_category_ids.append(current_category.parent_id.id)
                current_category = current_category.parent_id

        product_count = Product.search_count(domain)
        pager = request.website.pager(url=url, total=product_count, page=page, step=ppg, scope=7, url_args=post)
        products = Product.search(domain)

        ProductAttribute = request.env['product.attribute']
        if products:
            # get all products without limit
            selected_products = Product.search(domain, limit=False)
            attributes = ProductAttribute.search([('attribute_line_ids.product_tmpl_id', 'in', selected_products.ids)])
        else:
            attributes = ProductAttribute.browse(attributes_ids)

        values = {
            'search': search,
            'category': category,
            'attrib_values': attrib_values,
            'attrib_set': attrib_set,
            'pager': pager,
            'pricelist': pricelist,
            'products': products,
            'search_count': product_count,  # common for all searchbox
            'bins': TableCompute().process(products, ppg),
            'rows': PPR,
            'categories': categs,
            'attributes': attributes,
            'compute_currency': compute_currency,
            'keep': keep,
            'parent_category_ids': parent_category_ids,
        }
        if category:
            values['main_object'] = category
        return request.render("website_sale.products", values)

    @http.route()
    def cart_update(self, product_id, add_qty=1, set_qty=0, **kw):
        # def cart_update(self, **kw):
        main_item = request.env['product.template'].sudo().search(
            [('id', '=', product_id), ('is_addition', '=', False)])
        # addition_items = request.env['product.template'].sudo().search([('id', '=', product_id)]).child_id
        additions_list = dict([(int(key[16:-1]),int(value)) for key, value in kw.items() if key.startswith("additions_input[")])

        _logger.warning(additions_list)

        sub_count = 0
        if len(additions_list) > 0:
            addition_items = request.env['product.template'].sudo().browse(list(additions_list.keys())).filtered(
                lambda r: (
                    (r.is_multiple and additions_list[r.id] > 0) or (not r.is_multiple)
                ))
            sub_count = len(addition_items)
        
        _logger.warning("count: " + str(sub_count))
        old_item = True
        # check if the similar order already exists
        order = request.website.sale_get_order(force_create=1)

        if main_item:
            _logger.warning(order.id)
            _logger.warning(product_id)
            main_product_lines = request.env['sale.order.line'].search(
                [('order_id', '=', int(order.id)), ('product_id', '=', int(product_id))])
            _logger.warning('1')
            _logger.warning(main_product_lines)
            old_id = 0
            old_item = False
            if main_product_lines:
                _logger.warning('2')
                for main_product_line in main_product_lines:
                    old_item = True
                    sub_product = request.env['sale.order.line'].search([('parent_id', '=', main_product_line.id)])
                    if sub_product:
                        _logger.warning('3')
                        if len(sub_product) == len(addition_items):
                            old_item = True
                            _logger.warning(sub_product.ids)
                            _logger.warning(addition_items.ids)
                            for x in sub_product:
                                _logger.warning(x.product_id.id)
                                if x.product_id.id not in addition_items.ids:
                                    old_item = False

                        # if sub_product_count == sub_count:
                        #     for sub in sub_product:
                        #         # checking for is_multiple addons item
                        #         _logger.warning(sub.product_id.is_multiple)
                        #         if sub.product_id.is_multiple:
                        #             old_item = False
                        #             break
                        #         _logger.warning(sub.product_id.id)
                        #         if not kw.get('additions_input[' + str(sub.product_id.id) + ']'):
                        #             old_item = False
                        #             _logger.warning('Addons mismatch')
                        else:
                            old_item = False
                            _logger.warning('Addons count mismatch')
                    else:
                        old_item = False
                        _logger.warning('Addons count mismatch')
                    
                    if old_item == True:
                        old_id = main_product_line.id
                        break

            if not old_item:
                _logger.warning('Treating as new item')
                main = request.website.sale_get_order(force_create=1)._cart_update(
                    product_id=int(product_id),
                    add_qty=add_qty,
                    set_qty=set_qty,
                    line_id=False,
                    attributes=self._filter_attributes(**kw),
                )
                _logger.warning(main)
                for aitems in addition_items:
                    if aitems.is_multiple:
                        request.website.sale_get_order(force_create=1)._cart_update(
                            product_id=int(aitems.id),
                            add_qty=additions_list[aitems.id],
                            set_qty=set_qty,
                            line_id=False,
                            parent_id=main['line_id'],
                            attributes=self._filter_attributes(**kw),
                        )
                    else:
                        request.website.sale_get_order(force_create=1)._cart_update(
                            product_id=int(aitems.id),
                            add_qty=add_qty,
                            set_qty=set_qty,
                            line_id=False,
                            parent_id=main['line_id'],
                            attributes=self._filter_attributes(**kw),
                        )
            else:
                _logger.warning('treating as old item')
                m_line_id = request.env['sale.order.line'].search(
                    [('order_id', '=', int(order.id)), ('product_id', '=', int(product_id)), ('id', '=', old_id)])
                for m in m_line_id:
                    prev_product_qty = m.product_uom_qty
                    main = order._cart_update(
                        product_id=int(product_id),
                        add_qty=add_qty,
                        set_qty=set_qty,
                        line_id=m.id
                    )
                    s_line_ids = request.env['sale.order.line'].search(
                        [('order_id', '=', order.id), ('parent_id', '=', m.id)])
                    if s_line_ids:
                        for s in s_line_ids:
                            addition_new_qty = add_qty
                            if s.product_id.is_multiple:
                                addition_new_qty = (s.product_uom_qty / prev_product_qty) * add_qty
                            order._cart_update(
                                product_id=int(s.product_id),
                                add_qty=addition_new_qty,
                                set_qty=set_qty,
                                line_id=s.id
                            )
        return request.redirect("/shop/cart")

    @http.route()
    def cart_update_json(self, product_id, line_id=None, add_qty=None, set_qty=None, display=True):
        order = request.website.sale_get_order(force_create=1)
        if order.state != 'draft':
            request.website.sale_reset()
            return {}
        
        m_line_id = request.env['sale.order.line'].browse(line_id)
        _logger.warning("m_line_id" + str(m_line_id))
        prev_product_qty = m_line_id.product_uom_qty
        _logger.warning("prev_product" + str(prev_product_qty))
        
        # Add or delete addons
        s_line_ids = m_line_id.child_ids
        if s_line_ids:
            for s in s_line_ids:
                addition_new_qty = set_qty
                _logger.warning("addition_qty" + str(addition_new_qty))
                if s.product_id.is_multiple:
                    _logger.warning("masdfas")
                    addition_new_qty = (s.product_uom_qty / prev_product_qty) * int(set_qty)
                    _logger.warning("addition_qty" + str(addition_new_qty))

                order._cart_update(
                    product_id=int(s.product_id),
                    add_qty=add_qty,
                    set_qty=addition_new_qty,
                    line_id=s.id
                )

        # Add or delete product
        value = order._cart_update(product_id=product_id, line_id=line_id, add_qty=add_qty, set_qty=set_qty)
        
        if not order.cart_quantity:
            request.website.sale_reset()
            return value

        order = request.website.sale_get_order()
        value['cart_quantity'] = order.cart_quantity
        from_currency = order.company_id.currency_id
        to_currency = order.pricelist_id.currency_id

        if not display:
            return value

        value['website_sale.cart_lines'] = request.env['ir.ui.view'].render_template("website_sale.cart_lines", {
            'website_sale_order': order,
            'compute_currency': lambda price: from_currency.compute(price, to_currency),
            'suggested_products': order._cart_accessories()
        })
        return value


class OrderAppBusController(BusController):
    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        if options.get('product.product'):
            channels = list(channels)
            branch_channel = (
                request.db,
                'product.product',
                options.get('product.product')
            )
            channels.append(branch_channel)
        return super(OrderAppBusController, self)._poll(dbname, channels, last, options)


class OrderAppController(http.Controller):

    @route(['/website_cart_sidebar/product'], type='json', auth='public', website=True)
    def get_product(self, id=None, **kw):
        """
        Return product and its required dependencies for implementing the correct cart system.
            :param self: 
            :param id=None: 
            :param **kw: 
        """

        fields = ['id', 'name', 'active', 'barcode', 'calorie', 'carbohydrate', 'fat', 'protein', 'categ_id',
        'child_id', 'currency_id', 'description', 'description_sale', 'display_name', 'list_price', 'is_offer',
        'lst_price', 'offer_points', 'public_categ_ids', 'uom_id', 'uom_po_id', 'website_price', 'website_public_price']
        
        Product = request.env['product.template']
        _logger.warning("lskdf" + str(id))
        
        if id:
            domain = [("id", "=", id), ("is_addition", "=", False)]
        else:
            domain = None
        
        product = Product.sudo().search_read(domain, fields, limit=1)
        for prod in product:
            fields = ['id', 'name', 'active', 'barcode', 'calorie', 'carbohydrate', 'fat', 'protein', 'categ_id',
            'currency_id', 'description', 'description_sale', 'display_name', 'list_price',
            'lst_price', 'offer_points', 'public_categ_ids', 'uom_id', 'uom_po_id', 'website_price', 'website_public_price',
            'is_addition', 'is_multiple']
            domain = [("id", "in", prod['child_id'])]
            additions = sorted(Product.sudo().search_read(domain, fields), key=lambda a: a['public_categ_ids'][0])
        
        pricelist = request.website.get_current_pricelist()

        from_currency = request.env.user.company_id.currency_id
        to_currency = pricelist.currency_id
        compute_currency = lambda price: from_currency.compute(price, to_currency)
        
        _logger.warning(compute_currency(product[0]['lst_price']))
        _logger.warning("before addition cult")
        for addition in additions:
            categ_ids_list = []
            _logger.warning(addition['public_categ_ids'])  
            for public_categ_id in addition['public_categ_ids']:
                categ_ids_list.append(public_categ_id)

            _logger.warning("inside addition cult")
            domain = [('id', 'in', categ_ids_list)]
            fields = ['id', 'display_name', 'name', 'order', 'parent_id', 'sequence']
            addition['public_categs'] = request.env['product.public.category'].sudo().search_read(domain, fields)
          
        values = {
            # 'search': search,
            # 'category': category,
            # 'attrib_values': attrib_values,
            # 'attrib_set': attrib_set,
            # 'pager': pager,
            # 'pricelist': pricelist,
            'product': product,
            'additions': additions,
            # 'search_count': product_count,  # common for all searchbox
            # 'bins': TableCompute().process(products, ppg),
            # 'rows': PPR,
            # 'categories': categs,
            # 'attributes': attributes,
            # 'compute_currency': compute_currency,
            # 'keep': keep,
            # 'parent_category_ids': parent_category_ids,
        }
        return values
