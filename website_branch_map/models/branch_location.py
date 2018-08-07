# -*- coding: utf-8 -*-

import base64

from odoo import models, fields, api, tools, _
from odoo.exceptions import ValidationError
from odoo.modules.module import get_module_resource


class BranchLocation(models.Model):
    _name = 'branch.location'
    _description = "Innovations"
    _inherit = ['mail.thread', 'website.seo.metadata', 'website.published.mixin']
    _order = "sequence, name"
    _mail_post_access = 'read'

    @api.model
    def _default_image(self):
        image_path = get_module_resource('website_branch_map', 'static/src/img', 'spotlight-poi2_hdpi.png')
        return tools.image_resize_image_big(base64.b64encode(open(image_path, 'rb').read()))

    name = fields.Char(string="Name", help="Branch Name")
    active = fields.Boolean('Active', default=True)
    description = fields.Text()
    address = fields.Char(string="Address/Name", help="Branch's Address")
    telephone = fields.Char(string="Telphone", help="Branch's Telephone")
    email = fields.Char(string="Email", help="Contact Email")
    opening_hour = fields.Datetime(string='Opening Hour')
    closing_hour = fields.Datetime(string='Closing Hour')
    lat = fields.Float(string="Latitude", digits=(14,10), help="Latitude of the Branch.")
    lng = fields.Float(string="Longitude", digits=(14,11), help="Longitude of the Branch.")
    sequence = fields.Integer(string="Sequence", help="Gives the sequence order when displaying a list of branches.")

    # image: all image fields are base64 encoded and PIL-supported
    image = fields.Binary(
        "Photo", default=_default_image, attachment=True,
        help="This field holds the image used as photo for the innovations, limited to 1024x1024px.")
    image_medium = fields.Binary(
        "Medium-sized photo", attachment=True,
        help="Medium-sized photo of the employee. It is automatically "
             "resized as a 128x128px image, with aspect ratio preserved. "
             "Use this field in form views or some kanban views.")
    image_small = fields.Binary(
        "Small-sized photo", attachment=True,
        help="Small-sized photo of the employee. It is automatically "
             "resized as a 64x64px image, with aspect ratio preserved. "
             "Use this field anywhere a small image is required.")

    @api.model
    def create(self, vals):
        tools.image_resize_images(vals)
        branch = super(BranchLocation, self).create(vals)
        (channel, message) = ((self._cr.dbname, 'branch.location', '1'), ('new_branch', branch.id))
        self.env['bus.bus'].sendone(channel, message)
        return branch

    @api.multi
    def write(self, vals):
        tools.image_resize_images(vals)
        branch = super(BranchLocation, self).write(vals)
        if branch:
            (channel, message) = ((self._cr.dbname, 'branch.location', '1'), ('update_branch', self.id))
            self.env['bus.bus'].sendone(channel, message)
        return branch

    def unlink(self):
        notifications = []
        for branch in self:
            notifications.append(((self._cr.dbname, 'branch.location', '1'), ('unlink_branch', branch.id)))
        self.env['bus.bus'].sendmany(notifications)
        return super(BranchLocation, self).unlink()