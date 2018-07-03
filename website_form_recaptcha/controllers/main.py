# Copyright 2016-2017 LasLabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

import logging

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError

from odoo.addons.website_form.controllers.main import WebsiteForm

import json

_logger = logging.getLogger(__name__)


class WebsiteForm(WebsiteForm):

    @http.route(
        '/website/recaptcha/',
        type='http',
        auth='public',
        methods=['POST'],
        website=True,
        multilang=False,
    )
    def recaptcha_public(self):
        return json.dumps({
            'site_key': request.env['ir.config_parameter'].sudo().get_param(
                'recaptcha.key.site'
            ),
        })

    def extract_data(self, model, values):
        """ Inject ReCaptcha validation into pre-existing data extraction """
        # delete recaptcha response code to make email clean
        if 'g-recaptcha-response' in values:
            del values["g-recaptcha-response"]

        # Prepare and Prepend subject for the email
        if 'form_type' in values:
            if values['form_type'] == 'connect_form':
                values['subject'] = values['Fullname'].title() + ' sent you ' + values['Subject'] + ' inquiry'
            elif values['form_type'] == 'talk_to_our_expert_form':
                values['subject'] = values['Fullname'].title() + ' wants to talk to our expert ' + values['Query for']

            del values['form_type']
        res = super(WebsiteForm, self).extract_data(model, values)
        if model.website_form_recaptcha:
            captcha_obj = request.env['website.form.recaptcha']
            ip_addr = request.httprequest.environ.get('HTTP_X_FORWARDED_FOR')
            if ip_addr:
                ip_addr = ip_addr.split(',')[0]
            else:
                ip_addr = request.httprequest.remote_addr
            try:
                captcha_obj.action_validate(
                    values.get(captcha_obj.RESPONSE_ATTR), ip_addr
                )
            except ValidationError:
                raise ValidationError([captcha_obj.RESPONSE_ATTR])
        return res
