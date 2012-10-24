var _ = require('underscore'),
    config = module.exports,
    default_config = {
      rootPath: "../",
      environment: "browser",
      testHelpers: [
        'test/helpers.js'
      ],
      resources: [
        'test/example-resource.css',
        'test/example-resource.js'
      ],
      sources: [
        'src/iframe.js',
        'src/jquery.iframe.js',
        'src/plone.init.js',
        'src/plone.mask.js',
        'src/plone.overlay.js',
        'src/plone.cmsui.js',
        'src/plone.tabs.js'
      ],
      tests: [
        'test/iframe-test.js',
        'test/jquery.iframe-test.js'
      ],
      extensions: [
        require("buster-coverage")
      ],
      "buster-coverage": { combinedResultsOnly: true }
      };


config["plone.app.toolbar:jquery-1.7"] = _.extend({}, default_config, {
  libs: [
    'lib/jquery-1.7.2.min.js'
  ]
});
config["plone.app.toolbar:jquery-1.8"] = _.extend({}, default_config, {
  libs: [
    'lib/jquery-1.8.2.min.js'
  ]
});
