var _ = require('underscore'),
    config = module.exports,
    _default = {
        rootPath: "../",
        environment: "browser",
        extensions: [ require("buster-coverage") ],
        "buster-coverage": {
          coverageExclusions: ["example-resource"],
          combinedResultsOnly: true }
      };


function matrixConfig(matrix) {
  _.each(matrix, function(i, key) {

    config['plone.app.toolbar-jquery.iframe.js-' + key] = _.extend(
      {}, _default, {
        libs:     matrix[key],
        sources:  [ 'src/jquery.iframe.js' ],
        tests:    [ 'test/jquery.iframe-test.js' ]
      });

    config['plone.app.toolbar-jquery.mask.js-' + key] = _.extend(
      {}, _default, {
        libs:     matrix[key],
        sources:  [ 'src/jquery.mask.js' ],
        tests:    [ 'test/jquery.mask-test.js' ]
      });

    config['plone.app.toolbar-plone.init.js-' + key] = _.extend(
      {}, _default, {
        libs:     matrix[key],
        sources:  [ 'src/plone.init.js' ],
        tests:    [ 'test/plone.init-test.js' ]
      });

    config['plone.app.toolbar-plone.tabs.js-' + key] = _.extend(
      {}, _default, {
        libs:     [].concat(matrix[key])
                    .concat([
                      'lib/bootstrap/js/bootstrap-tab.js',
                      'src/plone.init.js'
                      ]),
        sources:  [ 'src/plone.tabs.js' ],
        tests:    [ 'test/plone.tabs-test.js' ]
      });

    config['plone.app.toolbar-plone.overlay.js-' + key] = _.extend(
      {}, _default, {
        resources:  [ 'test/example-resource-errorform.html',
                      'test/example-resource.html' ],
        libs:       [].concat(matrix[key])
                      .concat([
                        'lib/jquery.form.js',
                        'lib/bootstrap/js/bootstrap-modal.js',
                        'src/jquery.iframe.js',
                        'src/jquery.mask.js',
                        'src/plone.init.js'
                        ]),
        sources:    [ 'src/plone.overlay.js' ],
        tests:      [ 'test/plone.overlay-test.js' ]
      });

  });
}


config['plone.app.toolbar-iframe.js'] = _.extend({}, _default, {
    resources:    [ 'test/example-resource.css', 'test/example-resource.js' ],
    testHelpers:  [ 'test/iframe-helpers.js' ],
    sources:      [ 'src/iframe.js' ],
    tests:        [ 'test/iframe-test.js' ]
  });


matrixConfig({
  'jquery-1.7': [ 'lib/jquery-1.7.2.min.js' ],
  'jquery-1.8': [ 'lib/jquery-1.8.2.min.js' ]
  });
