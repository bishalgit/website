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
        addition_items = request.env['product.template'].sudo().search([('id', '=', product_id)]).child_id
        sub_count = 0
        for aitems in addition_items:
            if kw.get('additions_input[' + str(aitems.id) + ']'):
                sub_count += 1
        old_item = True
        # check if the similar order already exists
        order = request.website.sale_get_order(force_create=1)

        if main_item:
            _logger.warning(order.id)
            _logger.warning(product_id)
            main_product = request.env['sale.order.line'].search(
                [('order_id', '=', int(order.id)), ('product_id', '=', int(product_id))])
            _logger.warning(main_product)
            old_id = 0
            if main_product:
                for mp in main_product:
                    old_item = True
                    sub_product = request.env['sale.order.line'].search([('parent_id', '=', mp.id)])
                    sub_product_count = request.env['sale.order.line'].search_count([('parent_id', '=', mp.id)])
                    _logger.warning(sub_product_count)
                    _logger.warning(sub_count)
                    if sub_product_count == sub_count:
                        for sub in sub_product:
                            # checking for is_multiple addons item
                            _logger.warning(sub.product_id.is_multiple)
                            if sub.product_id.is_multiple:
                                old_item = False
                                break
                            _logger.warning(sub.product_id.id)
                            if not kw.get('additions_input[' + str(sub.product_id.id) + ']'):
                                old_item = False
                                _logger.warning('Addons mismatch')
                    else:
                        old_item = False
                        _logger.warning('Addons count mismatch')
                    if old_item == True:
                        old_id = mp.id
                        break
            else:
                _logger.warning('New Main Product')
                old_item = False

            if old_item == False:
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
                    if kw.get('additions_input[' + str(aitems.id) + ']'):
                        if aitems.is_multiple:
                            if int(kw.get('additions_input[' + str(aitems.id) + ']')) > 0:
                                request.website.sale_get_order(force_create=1)._cart_update(
                                    product_id=int(aitems.id),
                                    add_qty=kw.get('additions_input[' + str(aitems.id) + ']'),
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
                    main = order._cart_update(
                        product_id=int(product_id),
                        add_qty=add_qty,
                        set_qty=set_qty,
                        line_id=m.id
                    )
                    s_line_id = request.env['sale.order.line'].search(
                        [('order_id', '=', order.id), ('parent_id', '=', m.id)])
                    for s in s_line_id:
                        order._cart_update(
                            product_id=int(s.product_id),
                            add_qty=add_qty,
                            set_qty=set_qty,
                            line_id=s.id
                        )
        return request.redirect("/shop/cart")


class BranchLocationController(BusController):
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
        return super(BranchLocationController, self)._poll(dbname, channels, last, options)


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
