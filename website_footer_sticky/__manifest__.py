# -*- coding: utf-8 -*-
# Copyright 2018 Susan K.C.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': "Webisite Sticky Footer",

    'summary': """
        Makes sticky footer in website.""",

    'description': """
        Makes sticky footer in website.
    """,

    'author': "Susan K.C.",
    'license': 'AGPL-3',
    'website': "https://www.susankc.com",
    'email': "susan.kc13@gmail.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Website',
    'version': '11.0.1.0.0',

    # any module necessary for this one to work correctly
    'depends': ['website'],

    # always loaded
    'data': [
        'views/assets.xml',
        'views/menu.xml',
    ],
}