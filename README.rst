This repository is archived and read only.

If you want to unarchive it, then post to the [Admin & Infrastructure (AI) Team category on the Plone Community Forum](https://community.plone.org/c/aiteam/55).

The goal of ``plone.app.toolbar`` is to provide an even easier way to theme
Plone by creating managing toolbar inside iframe.

.. image:: https://travis-ci.org/plone/plone.app.toolbar.png
   :target: https://travis-ci.org/plone/plone.app.toolbar

.. contents::

Is safe to use this package?
============================

This package should be safe to install and easy to uninstall (there is also
uninstall profile). That means its fairly safe to give it a try, but just in
case don't forget to create backup before testing it.

As of version 1.4.0 there is quite comprehensive unittest coverage of python
code as well as high coverage of our javascript code. There are also some robot
tests which are testing integration with Plone, but this will be improved with
future releases.

This project will be integrated with Plone 5 and will never reach version
2.0.0. You can monitor progress of `PLIP here`_.

If you wonder why there is no Alpha/Beta marker in version, its because version
of this package is kept in sync with other projects deriving from `Mockup`_
(eg. `plone.app.widgets`_).  Version 1.4.1 would then mean we're using
`Mockup`_ version 1.4 and there was one bugfix only to the python code. Version
packaged javascript inside is still in sync with `Mockup`_ project.


Installation
============

For now only tested with latest Plone 4.3::

    [buildout]
    extends =
         http://dist.plone.org/release/4.3-latest/versions.cfg
         https://raw.github.com/plone/plone.app.toolbar/master/versions.cfg
    versions = versions
    parts = instance

    [instance]
    recipe = plone.recipe.zope2instance
    user = admin:admin
    http-address = 8080
    eggs =
        Pillow
        Plone
        plone.app.toolbar


Make sure you install the "Plone Toolbar" profile when creating your Plone site
or include ``plone.app.toolbar:default`` profile in your ``metadata.xml``..


Diazo rules
===========

First we need to copy the toolbar's HTML code::

    <before theme-children="/html/body"
        content="//div[@data-iframe='plone-toolbar']" />

Then, in case we are not copying all resources from Plone (content) into
the theme we have to include the toolbar's resources and its dependencies
as well::

    <before theme-children="/html/head">
        <link rel="stylesheet" type="text/css"
            href="++resource++plone.app.widgets.css"/>
        <link rel="stylesheet" type="text/css"
            href="++resource++plone.app.toolbar_init.css"/>
        <link rel="stylesheet" type="text/css"
            href="++resource++plone.app.toolbar.css"/>
        <script type="text/javascript"
            src="++resource++plone.app.jquery.js"></script>
        <script type="text/javascript"
            src="++resource++plone.app.toolbar_init.js"></script>
        <script type="text/javascript"
            src="++resource++plone.app.toolbar.js"></script>
        <script type="text/javascript"
            src="++resource++plone.app.widgets.js"></script>
    </before>

Also, in order to correctly support updating a page after using `Edit`, you
must ensure that the element ``#portal-column-content`` exists within your
theme.  In short, as with Plone's default theme, this element should correspond
to the main content column. It will be repopulated with updated content after
an edit action takes place via the toolbar.  A rule similar to this is
needed - in this case, the entire element is placed into the theme::

    <replace css:theme-children="#content article"
        css:content="#portal-column-content" />

For the technically minded, the element of
``#portal-column-content`` will be repopulated with HTML corresponding to the
same element ID from a response body returned after an edit takes place.

The above rules and consideration should be enough so that your theme
will support `plone.app.toolbar`_.


Help with develpment
====================

All client side code (javascript/css/images) is done and tested as part of
`Mockup`_ project.

.. image:: https://travis-ci.org/plone/mockup.png
   :target: https://travis-ci.org/plone/mockup
   :alt: Travis CI

.. image:: https://coveralls.io/repos/plone/mockup/badge.png?branch=master
   :target: https://coveralls.io/r/plone/mockup?branch=master
   :alt: Coveralls

.. image:: https://d2weczhvl823v0.cloudfront.net/plone/mockup/trend.png
   :target: https://bitdeli.com/free
   :alt: Bitdeli

For any feature / bug / comment please create an issue in the `issue tracker`_.


.. _`Mockup`: http://plone.github.io/mockup
.. _`PLIP here`: https://dev.plone.org/ticket/13476
.. _`plone.app.widgets`: https://github.com/plone/plone.app.widgets
.. _`plone.app.toolbar`: https://github.com/plone/plone.app.toolbar
.. _`issue tracker`: https://github.com/plone/mockup/issues?labels=toolbar
