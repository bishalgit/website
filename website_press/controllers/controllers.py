# -*- coding: utf-8 -*-

import werkzeug

from odoo.addons.bus.controllers.main import BusController
from odoo import http, fields, _
from odoo.addons.http_routing.models.ir_http import slug, unslug
from odoo.addons.website.controllers.main import QueryURL
from odoo.http import request, route

import logging

_logger = logging.getLogger(__name__)


class PressController(BusController):
    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        if options.get('website.press'):
            channels = list(channels)
            press_channel = (
                request.db,
                'website.press',
                options.get('website.press')
            )
            channels.append(press_channel)
        return super(PressController, self)._poll(dbname, channels, last, options)

class WebsitePressController(http.Controller):
    _press_per_page = 8

    @http.route(['/press',
                 '/press/<path:route>',
                 '/press/page/<int:page>'], auth='public', website=True)
    def press(self, page=1, sortby=None, **post):

        # for sorting the latest press on top
        press_sortings = {
            'date': {'label': _('Created Date'), 'order': 'create_date desc'},
            'name': {'label': _('Press Title'), 'order': 'name'},
        }
        if not sortby:
            sortby = 'date'
        sort_order = press_sortings[sortby]['order']

        # for pagination
        PressData = request.env['website.press']
        total_press_data = PressData.search([], count=True)
        press_data = PressData.search([], limit=2)
        if len(press_data) == 1:
            return werkzeug.utils.redirect('/press/%s' % slug(press_data[0]), code=302)

        # calling pagination method
        pager = request.website.pager(
            url='/press',
            total=total_press_data,
            page=page,
            step=self._press_per_page,
        )

        # limiting press post for each page
        press_posts = PressData.search([], order=sort_order,
                                       offset=(page - 1) * self._press_per_page,
                                       limit=self._press_per_page)
        press_url = QueryURL('', ['press'])

        # transferring values to template for rendering
        values = {
            'press_posts': press_posts,
            'pager': pager,
            'press_url': press_url,
        }
        return http.request.render('website_press.press', values)

    @route(['/website_press/get_posts'], type='json', auth='public', website=True)
    def get_posts(self, id=None, offset=0, limit=8, fields=None, **kw):
        _logger.warning("Offset >>>>>>>>> " + str(offset))
        if id:
            domain = [("id", "=", id)]
        else:
            domain = None
        return request.env['website.press'].sudo().search_read(domain, fields, offset=offset, limit=limit)
