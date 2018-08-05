# -*- coding: utf-8 -*-
{
    'name': "Website Branch Location",

    'summary': """
        This module will allow to create owl categories/items for website
        owl carousel.""",

    'description': """
        This module is developed for the dynamic website owl carousel. For example 
        clients, brands, products, etc as dynamic owl carousel.
    """,

    'author': "Bishal Pun",
    'website': "https://www.bishalkaucha.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'website',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['website'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/assets.xml',
        'views/templates.xml',
        'views/views.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
    'installable': True,
    'application': True,
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
}