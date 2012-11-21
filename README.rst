=======================
Introduction to Toolbar
=======================

``plone.app.toolbar`` installs a new content editing toolbar for Plone.


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

Elements with ``data-iframe`` attribute are picked by `iframe.js`_ and inserts
resources found in ``data-iframe-resources`` attribute. `iframe.js` script
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
`iframe.js`_::

    <append theme="/html/body"
        content="//div[@data-iframe='toolbar']" />

Then in case we are not copying all resources from Plone to theme we have to
include `iframe.js`_::

    <append theme="/html/head">
        <script type="text/javascript"
            src="++resource++plone.app.toolbar/src/iframe.js"></script>
    </append>

Above 2 rules should be enought so that your theme will support
`plone.app.toolbar`_


Toolbar and overlays
====================

`plone.overlay.js`_ script provides us with a jQuery plugin
(``$.fn.ploneOverlay``) which provides smooth integration of various libraries
and gives us a lot of options how to plugin custom functionality.

As said there are many options which change default behaivour of
``ploneOverlay``, you can look them up below at Options section.


Example: Trigger overlay from link element
------------------------------------------

Somewhere in html we have a link element::

    ...
    <a id="special-link" href="some/url#content">Open in overlay</a>
    ...

Simplest way::

    $(document).ready(function() {
        $('#special-link').ploneOverlay();
    });

Above registration is used for links in Plone's default toolbar menu at the
top. Code can be found in `plone.cmsui.js`_.


Example: Show already existing content in overlay
-------------------------------------------------

Somewhere in html we have an element which we want to show in overlay::
 
    ...
    <div id="special-content">
        Some very important things to show in overlay
    </div>
    ...

When some event happens we show element in overlay::

    $(document).ready(function() {
        $(document).on('some-event', function() {
            $('#special-content').ploneOverlay({ show: true; });
        });
        $(document).on('some-other-event', function() {
            $('#special-content').ploneOverlay({ hide: true; });
        });
    });


Example: Form in overlay
------------------------

TODO: write simple form example


$.fn.ploneOverlay.Constructor options
-------------------------------------

Default values for Constructor options can be found
``$.fn.ploneOverlay.defaults``.

``el``
    If string it will be treated as url otherwise dom element is expected.

``mask``
    Mask object which should provide ``load`` and ``close`` attributes to call.
    ``load`` should show mask element and ``close`` should hide it.
    Default: $.mask (from `jquery.mask.js`_)

``changeAjaxURL``
    Function which gets called with original URL as paramether and should
    return URL which is used in AJAX call when retriving content of overlay.
    Default: function which appends '++unthemed++' before URI. eg:
    http://plone.org/some/site -> http://plone.org/++unthemed++/some/site

``modalTemplate``
    Function which takes modal content as first attribute and returns element
    which is new modal content. This way we can provide most flexible
    templating of modal.

``formButtons``
    Array of buttons and their functions which return ajaxSubmit options.
    Example::
    
        {
            'input#button-selector': $.fn.ploneOverlay.defaultFormButton({
                onSave: function() { ... },
                onError: function() { ... }
              }),
            'button#some-other-button': $.fn.ploneOverlay.defaultFormButton({
                onSave: function() { ... },
                onError: function() { ... }
              }),
            ...
        }

``onBeforeLoad``
    Hook which is called before AJAX request. If AJAX request will never happen
    for our overlay then this hook is never called.

``onLoaded``
    Hook which is called after AJAX request and before we initialize modal.

``onInit``
    Hook which is called after modal is initialized. This happens after AJAX
    request.

``onShow``
    Hook which is called after modal is shown.

``onHide``
    Hook which is called after modal is hidden.

``onDestroy``
    Hook which is called after modal has been destroyed.


$.fn.ploneOverlay options
-------------------------

Also all options of Constructor can be passed along with this options.

``show``
    If set to true immidiatly show overlay.

``hide``
    If set to true immidiatly hide overlay.


$.fn.ploneOverlay.defaultModalTemplate
--------------------------------------

TODO: need to describe how to use defaultModalTemplate when overlay template is
different.


$.fn.ploneOverlay.defaultAjaxSubmit
-----------------------------------

TODO: explain how to defaultAjaxSubmit can be used



.. _`buildout.deco`: https://github.com/plone/buildout.deco
.. _`plone.app.toolbar`: https://github.com/plone/plone.app.toolbar
.. _`plone.app.blocks`: https://github.com/plone/plone.app.blocks
.. _`iframe.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/iframe.js
.. _`jquery.iframe.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/jquery.iframe.js
.. _`jquery.mask.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/jquery.mask.js
.. _`jquery.form.js`: http://jquery.malsup.com/form
.. _`plone.overlay.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.overlay.js
.. _`plone.cmsui.js`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/resources/src/plone.cmsui.js
.. _`bbb`: https://github.com/plone/plone.app.toolbar/blob/master/plone/app/toolbar/bbb.zcml
