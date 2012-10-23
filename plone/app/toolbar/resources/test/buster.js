var config = module.exports;


config["plone.app.toolbar"] = {
    rootPath: "../",
    environment: "browser",
    testHelpers: [
      'test/helpers.js'
    ],
    resources: [
      'test/example-resource.css',
      'test/example-resource.js'
    ],
    libs: [
      'lib/jquery-1.7.2.min.js'
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
    ]
};
