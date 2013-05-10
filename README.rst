=======================
Introduction to Toolbar
=======================

``plone.app.toolbar`` installs a new content editing toolbar for Plone.

.. contents::


Current status
==============

Current focus of ``plone.app.toolbar`` is to get interfaces of Content editors
into overlays. This excludes all pages in ``Site Setup``.

There are 2 form widgets which haven't yet been made functional in
``plone.app.toolbar``:

- ``Related Items`` widget.
- ``Search filter`` widget in Collection content type.

Other then that things **should** be working, if they don't please report them
to `issue tracker`_.


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
    plone.app.widgets = 0.2
    plone.app.toolbar = 1.2

Bellow version pins are for Plone version 4.3rc1 or higher.

Make sure you install the "Plone Toolbar" profile when creating your Plone site
or include ``plone.app.toolbar:default`` profile in your ``metadata.xml``..

To start developing plone.app.toolbar you can find buildout at
``buildout.deco`` repository.::
    
    https://github.com/plone/buildout.deco/blob/master/toolbar.cfg
    

Diazo rules
===========

First we need to copy the toolbar's HTML code::

    <append theme="/html/body"
        content="//div[@data-iframe='plone-toolbar']" />

Then, in case we are not copying all resources from Plone (content) into 
the theme we have to include the toolbar's resources as well::

    <append theme="/html/head">
        <link rel="stylesheet" type="text/css"
            href="++resource++plone.app.toolbar_init.css"/>
        <script type="text/javascript"
            src="++resource++plone.app.toolbar_init.js"></script>
    </append>

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
.. _`issue tracker`: https://github.com/plone/plone.app.toolbar/issues
