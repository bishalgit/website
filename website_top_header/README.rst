.. image:: https://img.shields.io/badge/licence-AGPL--3-blue.svg
   :target: http://www.gnu.org/licenses/agpl-3.0-standalone.html
   :alt: License: AGPL-3

==================
Website Top Header
==================

This module adds the top header in website.

=============
Configuration
=============

To change the top header:

* Go to *Settings > Technical > User Interface > Views*.
* Search for the view called *top_header*.
* Change as you wish. Remember that you will probably lose translations then.

If you are developing a theme for Odoo, remember that this content has the
``top-header`` class. You can style it at will too.

======================
Known Issues / Roadmap
======================

* If you are using this module in version < 8.0.2.0.0 and update it, any other
  module that modifies the ``res.company`` view will break in the next update
  if Odoo decides to update it before this one. To avoid that:

  1. Stop your server.
  2. Update only this module: ``odoo.py -u website_top_header``.
  3. Stop your server.
  4. Update all other modules: ``odoo.py -u all``.
  5. Start your server.

===========
Bug Tracker
===========

Bugs are tracked on `GitHub Issues
<https://github.com/bishalgit/website/issues>`_. In case of trouble, please
check there if your issue has already been reported. If you spotted it first,
help us smashing it by providing a detailed and welcomed feedback.

Credits
=======

Images
------

* Odoo Community Association: `Icon <https://github.com/OCA/maintainer-tools/blob/master/template/module/static/description/icon.svg>`_.

Contributors
------------

* Bishal Pun <bishalpun2013@gmail.com>
* Sujana Bhandari <sujana6589@gmail.com>
* Purnima Sai <psai56881@gmail.com>

Maintainer
----------

.. image:: https://odoo-community.org/logo.png
   :alt: Odoo Community Association
   :target: https://odoo-community.org

This module is maintained by the OCA.

OCA, or the Odoo Community Association, is a nonprofit organization whose
mission is to support the collaborative development of Odoo features and
promote its widespread use.

To contribute to this module, please visit http://odoo-community.org.
