var config = module.exports;

config["plone.app.toolbar"] = {
    rootPath: "../",
    environment: "browser",
    testHelpers: [
      'test/helpers/*.js'
    ],
    resources: [
      'test/resources/*'
    ],
    sources: [
      'src/*.js'
    ],
    tests: [
      'test/*-test.js'
    ],
    extensions: [
      require("buster-lint"),
      require("buster-coverage")
    ]
};
