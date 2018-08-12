# -*- coding: utf-8 -*-

import logging

from odoo import api, fields, models, tools

from odoo.http import request

_logger = logging.getLogger(__name__)


class Website(models.Model):
    _inherit = 'website'

    @api.multi
    def sale_product_domain(self):
        return [("sale_ok", "=", True),('is_addition', '=', False)]
