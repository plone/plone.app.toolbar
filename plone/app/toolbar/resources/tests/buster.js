var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "browser",
    sources: [
      'src/iframed.js'
    ],
    tests: [
        "test/*-test.js"
    ]
};
