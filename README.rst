=======================
Introduction to Toolbar
=======================

``plone.app.toolbar`` installs a new content editing toolbar for Plone.


Installation
============

To install toolbar drop following lines to your buildout.cfg::

    [buildout]
    extends = http://dist.plone.org/release/4.3b2/versions.cfg
    versions = versions
    parts = instance

    [instance]
    recipe = plone.recipe.zope2instance
    user = admin:admin
    http-address = 8080
    eggs =
        Pillow
        Plone
        plone.app.widgets[archetypes]
        plone.app.toolbar
    zcml =
        plone.app.toolbar

    [versions]
    Products.TinyMCE = 1.3b10
    plone.app.jquery = 1.8.3
    plone.app.search = 1.1.2
    plone.app.vocabularies = 2.1.10

Bellow version pins are for Plone version 4.3b2 or higher.

Make sure you install the "Plone Toolbar" profile when creating your Plone site
or include ``plone.app.toolbar:default`` profile in your ``metadata.xml``..

To start developing plone.app.toolbar you can find buildout at
``buildout.deco`` repository.::
    
    https://github.com/plone/buildout.deco/blob/master/toolbar.cfg
    

Diazo rules
===========

First we need to copy toolbar's html code::

    <append theme="/html/body"
        content="//div[@data-iframe='plone-toolbar']" />

Then in case we are not copying all resources from Plone (content) to theme we
have to include resources as well::

    <append theme="/html/head">
        <link rel="stylesheet" type="text/css"
            href="++resource++plone.app.toolbar_init.css"/>
        <script type="text/javascript"
            src="++resource++plone.app.toolbar_init.js"></script>
    </append>

Above 2 rules should be enough so that your theme will support
`plone.app.toolbar`_.


.. _`buildout.deco`: https://github.com/plone/buildout.deco
.. _`plone.app.toolbar`: https://github.com/plone/plone.app.toolbar
