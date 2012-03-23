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
