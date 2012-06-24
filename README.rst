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
    plone.tiles = 1.1
    plone.app.toolbar = 1.1

Bellow version pins are for Plone version 4.2 or higher.

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


Diazo rules
===========

First we need to copy toolbar's html code, which will be picked by
`iframed.js`_::

    <append theme="/html/body"
        content="//div[@data-iframe='toolbar']" />

Then in case we are not copying all resources from Plone to theme we have to
include `iframed.js`_::

    <append theme="/html/head">
        <script type="text/javascript"
            src="++resource++plone.app.toolbar/src/iframed.js"></script>
    </append>

Above 2 rules should be enought so that your theme will support
`plone.app.toolbar`_


Changelog
=========


1.1 (2012-06-22)
----------------

- plone.overlay.js is serving overlay content from urls with "/++unthemed++/"
  appended to their path. this gets content without diazo theme being applied.
  [garbas]

- plone.mask.js: bug with resizing mask fixed.
  [garbas]

- plone.overlay.js script is now included for support of deco plone.app.deco
  version  1.0.
  [garbas]

- removed dependency jquerytools by packaging jquery.form.js inside
  plone.app.toolbar
  [garbas]

- edit action on deco enabled pages will have "plone-action-deco" id
  [garbas]

- bootstrap_overlay_trasform moved from ``plone.cmsui.js`` script to
  ``plone.overlay.js``
  [garbas]

- adding javascript (and register them in resources register) needed for deco:
  plone.mask.js, plone.overlay.js, bootstrap-tooltip.js, bootstrap-modal.js
  [garbas]

- added IFramed.add method to IFramed object. now its possible to "commulate"
  content inside one iframe.
  [garbas]

- other tabs in user/group management were not showing #edit-bar.
  [garbas]

- removed development code which inserted less files.
  [garbas]


1.0 (2012-05-28)
----------------

- initial release
  [garbas]


.. _`buildout.deco`: https://github.com/plone/buildout.deco
.. _`plone.app.toolbar`: https://github.com/plone/plone.app.toolbar
.. _`plone.app.blocks`: https://github.com/plone/plone.app.blocks
.. _`iframed.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/iframed.js
.. _`plone.overlay.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.overlay.js
.. _`plone.cmsui.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.cmsui.js
.. _`bbb`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/bbb.zcml
