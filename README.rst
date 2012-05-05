============
Introduction
============

.. contents:: Contents

plone.app.toolbar installs a new toolbar for Plone.
For the moment, it is an experiment only, but hopefully one that will point
the way towards Plone's future.


Installation
============

You can use the following buildout to test plone.app.toolbar against
Plone 4.2a2 - update versions as applicable::

    [buildout]
    extends = https://raw.github.com/plone/buildout.deco/master/toolbar-only.cfg
    
Make sure you install the "Plone Toolbar" profile when creating your
Plone site.


How it works
============

Registers toolbar tile which creates toolbar html on every page in twitter
bootstrap structure and is hidden by default. Toolbar tile also lists resouces
from ``toolbar`` skin in ``data-iframe-resources`` attribute of top element. ::

    <div style="display: none;"
         data-iframe-resouces="resource1.js;resource2.css;...">
      <div class="navbar">
        ...
      </div>
    </div>

``data-iframe-resouces`` attribute is picked out by `iframize.js`_ which creates
iframe with resources picked from ``data-iframe-resources`` attribute.
`iframize.js` script also takes care that dropdown in toolbar which goes
outside iframe area stretches it in transparent way so that user doesn't even
notice it.

Same transparent stretching of iframe is used when overlay is opened. This is
done by `plone.overlay.js`_ script. This script also triggers event when
toolbar button is clicked. You can subscribe to it you binding to
``plone_overlay.<id-of-button>`` jquery event.::

    // Example of how to bind to Contents button in toolbar
    $(document).on('plone_overlay.plone-action-folderContents', function(e) {
        ... do stuff
    });

Examples of this can be found in `plone.cmsui.js`_ script. At the time of
writing this documentation `plone.cmsui.js`_ script is not used by
plone.app.toolbar.

Since in current Plone we're not using `plone.app.blocks`_ to render tiles we
provide plone toolbar viewlet which renders toolbar tile. This is done by
`bbb`_ code that also makes sure that ``plone.app.toolbar`` is nicely
integrated into current Plone, eg: hidding old green edit bar, ...


More on plone.overlay.js
========================

TODO: once jquery.form.js is integrated into $.plone.Overlay write
documentation for it.


Todo
====

 - it should be possible to use custom skin for instead hardcoded `toolbar`
   skin


.. _`iframize.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/iframize.js
.. _`plone.overlay.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.overlay.js
.. _`plone.cmsui.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.cmsui.js
.. _`bbb`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/bbb.zcml
