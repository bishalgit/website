# -*- coding: utf-8 -*-
# Copyright 2018 Bishal Pun
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    'name': "Webisite Sale Cart Sidebar",

    'summary': """
        Makes cart sidebar in website.""",

    'description': """
        Makes cart sidebar in website.
    """,

    'author': "Bishal Pun",
    'license': 'AGPL-3',
    'website': "https://www.bishalkaucha.com",

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
    ],
}