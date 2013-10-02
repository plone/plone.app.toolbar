Changelog
=========

1.3 (unreleased)
----------------

- Upgrade robot test suite to use plone.app.robotframework instead plone.act.
  [thet]

- Fix ZCML loading using z3c.autoinclude.
  [rpatterson]


1.2 (2012-03-04)
----------------

- major update of everything
  [garbas]


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

