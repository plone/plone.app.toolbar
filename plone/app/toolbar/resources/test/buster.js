var config = module.exports;

config["plone.app.toolbar"] = {
    rootPath: "../",
    environment: "browser",
    testHelpers: [
      'test/helper.js'
    ],
    resources: [
      'test/example.css',
      'test/example.js'
    ],
    sources: [
      'src/iframed.js'
    ],
    tests: [
        "test/*-test.js"
    ]
};
