``plone.app.toolbar`` installs a new toolbar for Plone.

For the moment, it is an experiment only, but hopefully it will be soon ready
for prime time.

.. contents::


Installation
============

To install toolbar drop following lines to your buildout.cfg::

    [instance]
    eggs =
        ...
        plone.app.toolbar

    [versions]
    plone.app.jquery = 1.7.2
    plone.app.jquerytools = 1.4
    plone.tiles = 1.0b2
    Products.ResourceRegistries = 2.1.1
    plone.app.toolbar = 1.0

In case this document gets outdated use latest versions of eggs in ``versions``
section.

Make sure you install the "Plone Toolbar" profile when creating your Plone site
or include ``plone.app.toolbar:default`` profile in your ``metadata.xml``..

To start developing plone.app.toolbar you can find buildout at
``buildout.deco`` repository.::
    
    https://github.com/plone/buildout.deco/blob/master/toolbar-2.0.cfg
    

How it works
============

Registers toolbar tile which creates toolbar html on every page in twitter
bootstrap structure and is hidden by default. Toolbar tile also lists resources
from ``toolbar`` skin in ``data-iframe-resources`` attribute of top element. ::

    <div style="display: none;"
         data-iframe="example"
         data-iframe-resources="resource1.js;resource2.css;...">
      <div class="navbar">
        ...
      </div>
    </div>

Elements with ``data-iframe`` attribute are picked by `iframed.js`_ and inserts
resources found in ``data-iframe-resources`` attribute. `iframed.js` script
also takes care that dropdown in toolbar which goes outside iframe area
stretches it in transparent way so that user doesn't even notice it.

Same transparent stretching of iframe is used when overlay is opened. This is
done by `plone.overlay.js`_ script. Example of how to open overlay when user
click on ``Edit`` action in toolbar would be::

    $('#plone-toolbar ul.nav > li#plone-action-edit > a').ploneOverlay({
      after_load: function(overlay) {
        $.plone.cmsui.bootstrapOverlayTransform(overlay.el, overlay.loaded_data);
      }
    });

More examples of this can be found in `plone.cmsui.js`_ script.

Since in current Plone we're not using `plone.app.blocks`_ to render tiles we
provide plone toolbar viewlet which renders toolbar tile. This is done by
`bbb`_ code that also makes sure that ``plone.app.toolbar`` is nicely
integrated into current Plone, eg: hidding old green edit bar, ...


More on plone.overlay.js
========================

TODO: once jquery.form.js is integrated into $.plone.Overlay write
documentation for it.

More on plone.cmsui.js
======================

TODO: once it gets fairly working some documentation would be nice.


.. _`buildout.deco`: https://github.com/plone/buildout.deco
.. _ `p.a.toolbar github issues`: https://github.com/plone/plone.app.toolbar/issues
.. _`iframed.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/iframed.js
.. _`plone.overlay.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.overlay.js
.. _`plone.cmsui.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.cmsui.js
.. _`bbb`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/bbb.zcml
