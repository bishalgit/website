# -*- coding: utf-8 -*-
{
    'name': "Website Press",

    'summary': """
        Printing Media Partner for the Organization""",

    'author': "Inception Innovation",
    'website': "http://www.inceptioninnovation.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Website',
    'version': '11.0',

    # any module necessary for this one to work correctly
    'depends': ['base', 'website', 'u500'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/assets.xml',
        'views/templates.xml',
        'views/website_press_views.xml',
        'views/views.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
}