var config = module.exports;

var linterConf = {
    linter: 'jshint',
        linterOptions: {
            asi: false,
            bitwise: true,
            boss: false,
            browser: true,
            curly: true,
            devel: false,
            eqeqeq: true,
            evil: false,
            expr: false,
            forin: false,
            immed: true,
            jquery: true,
            latedef: false,
            mootools: false,
            newcap: true,
            node: false,
            noempty: true,
            nomen: false,
            nonew: true,
            onevar: false,
            plusplus: false,
            regexp: true,
            strict: false,
            supernew: true,
            undef: true,
            white: false
        },
        excludes: [
            "jquery"
       ]
};

config["My tests"] = {
    rootPath: "../",
    environment: "browser",
    sources: [
      'src/iframed.js'
    ],
    tests: [
        "tests/*-test.js"
    ],
    extensions: [
        require('buster-lint'),
        require("buster-coverage")
    ],
    "buster-lint": linterConf,
    "buster-coverage": {
        format: "cobertura",
        combinedResultsOnly: true
    }
};
