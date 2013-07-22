=======================
Introduction to Toolbar
=======================

``plone.app.toolbar`` installs a new content editing toolbar for Plone.

.. contents::


Motivation
==========

- Move the admin toolbar currently found in the content of a page (when
    logged in) to a separate, encapsulated, bar at the top of the page.

- Make it so themer's do not need to handle or manage admin specific UI,
        unless it is something they are are intentionally doing


Installation
============

To install toolbar drop following lines to your buildout.cfg::

    [buildout]
    extends = http://dist.plone.org/release/4.3rc1/versions.cfg
    versions = versions
    parts = instance

    [instance]
    recipe = plone.recipe.zope2instance
    user = admin:admin
    http-address = 7000
    eggs =
        Pillow
        Plone
        plone.app.widgets[archetypes]
        plone.app.toolbar
    zcml =
        plone.app.toolbar

    [versions]
    plone.app.jquery = 1.8.3

Bellow version pins are for Plone version 4.3rc1 or higher.

Make sure you install the "Plone Toolbar" profile when creating your Plone site
or include ``plone.app.toolbar:default`` profile in your ``metadata.xml``..

To start developing plone.app.toolbar you can find buildout at
``buildout.deco`` repository.::
    
    https://github.com/plone/buildout.deco/blob/master/toolbar.cfg
    

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


.. _`buildout.deco`: https://github.com/plone/buildout.deco
.. _`plone.app.toolbar`: https://github.com/plone/plone.app.toolbar
.. _`issue tracker`: https://github.com/plone/mockup/issues?labels=toolbar
