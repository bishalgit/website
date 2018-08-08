# -*- coding: utf-8 -*-

from odoo import models, fields, api, tools
import logging

_logger = logging.getLogger(__name__)


class WebsitePress(models.Model):
    _name = 'website.press'
    _description = "Press Posts"
    _inherit = ['mail.thread', 'website.seo.metadata', 'website.published.mixin']
    # _order = "sequence, name"
    _mail_post_access = 'read'

    name = fields.Char(string="Press Title", required=True)
    active = fields.Boolean('Active', default=True)

    # image: all image fields are base64 encoded and PIL-supported
    image = fields.Binary("Image", attachment=True)
    # image_medium = fields.Binary("Medium-sized image", attachment=True,
    #                              help="Medium-sized image of this contact. It is automatically " \
    #                                   "resized as a 128x128px image, with aspect ratio preserved. " \
    #                                   "Use this field in form views or some kanban views.")
    # image_small = fields.Binary("Small-sized image", attachment=True,
    #                             help="Small-sized image of this contact. It is automatically " \
    #                                  "resized as a 64x64px image, with aspect ratio preserved. " \
    #                                  "Use this field anywhere a small image is required.")

    # @api.multi
    # def write(self, vals):
    #     tools.image_resize_images(vals)
    #     result = True
    #     result = result and super(WebsitePress, self).write(vals)
    #     return result
    #
    # @api.model
    # def create(self, vals):
    #     tools.image_resize_images(vals)
    #     press = super(WebsitePress, self).create(vals)
    #     return press

    datetime = fields.Datetime('Press Datetime')
    topic = fields.Char('Press Topic')
    category = fields.Char('Press Category')
    description = fields.Text('Press Description')
    external_link = fields.Char('External Link')

    @api.model
    def create(self, vals):
        press = super(WebsitePress, self).create(vals)
        if press:
            (channel, message) = ((self._cr.dbname, 'website.press', '1'), ('new_post', press.id))
            _logger.warning("Post Created >>> " + str(press))
            self.env['bus.bus'].sendone(channel, message)
        return press

    @api.multi
    def write(self, vals):
        press = super(WebsitePress, self).write(vals)
        if press:
            (channel, message) = ((self._cr.dbname, 'website.press', '1'), ('update_post', self.id))
            _logger.warning("Post Updated >>> " + str(press))
            self.env['bus.bus'].sendone(channel, message)
        return press

    def unlink(self):
        notifications = []
        for press in self:
            notifications.append(((self._cr.dbname, 'website.press', '1'),
                                  ('unlink_post', press.id)))
        _logger.warning("Post Removed >>> " + str(press))
        self.env['bus.bus'].sendmany(notifications)
        return super(WebsitePress, self).unlink()
