# -*- coding: utf-8 -*-
from odoo.addons.bus.controllers.main import BusController
from odoo import http
from odoo.http import request, route


class BranchLocationController(BusController):
    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        if options.get('branch.location'):
            channels = list(channels)
            branch_channel = (
                request.db,
                'branch.location',
                options.get('branch.location')
            )
            channels.append(branch_channel)
        return super(BranchLocationController, self)._poll(dbname, channels, last, options)


class BranchMapController(http.Controller):
    @route(['/locations', '/branches'], auth='public', website=True)
    def view_branches(self, **kw):
        branches = request.env['branch.location'].search([])
        return request.render('website_branch_map.location', {
            'branches': branches
        })

    @route(['/website_branch_map/get_api_key'], type='json', auth='public', website=True)
    def get_api_key(self, **kw):
        return request.env['ir.config_parameter'].sudo().get_param('google_maps_api_key')

    @route(['/website_branch_map/get_branch_locations'], type='json', auth='public', website=True)
    def get_branch_locations(self, id=None, **kw):
        fields = ['id', 'name', 'active', 'description', 'address', 'telephone', 'email', 'lat', 'lng', 'opening_hour', 'closing_hour', 'sequence']
        if id:
            domain = [("id", "=", id)]
        else:
            domain = None
        return request.env['branch.location'].sudo().search_read(domain, fields)
