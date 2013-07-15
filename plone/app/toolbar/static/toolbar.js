(function($) {
  "use strict";

  $(document).ready(function() {

    var script2 = document.createElement('script');
    script2.setAttribute('type', 'text/javascript');
    script2.setAttribute('src', '/++resource++mockup/js/config.js');
    script2.onload = function() {
      requirejs.config({ baseUrl: '++resource++mockup/' });
      require(['mockup-bundles-toolbar'], function(Toolbar) {
        Toolbar.scan('body');
      });
    };

    var script1 = document.createElement('script');
    script1.setAttribute('type', 'text/javascript');
    script1.setAttribute('src', '/++resource++mockup/bower_components/requirejs/require.js');
    script1.onload = function() {
      document.getElementsByTagName("head")[0].appendChild(script2);
    };
    document.getElementsByTagName("head")[0].appendChild(script1);

    var link1 = document.createElement('link');
    link1.setAttribute('type', 'text/css');
    link1.setAttribute('rel', 'stylesheet/less');
    link1.setAttribute('href', '/++resource++mockup/less/toolbar.less');
    document.getElementsByTagName("head")[0].appendChild(link1);

    var script3 = document.createElement('script');
    script3.setAttribute('type', 'text/javascript');
    script3.setAttribute('src', '/++resource++mockup/node_modules/less/dist/less-1.4.1.js');
    document.getElementsByTagName("head")[0].appendChild(script3);

  });

}(jQuery));
