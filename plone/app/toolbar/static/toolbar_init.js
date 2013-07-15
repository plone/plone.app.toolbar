(function($) {
  "use strict";

  $(document).ready(function() {

    var script1 = document.createElement('script');
    script1.setAttribute('type', 'text/javascript');
    script1.setAttribute('src', '/++resource++mockup/js/iframe_init.js');
    document.getElementsByTagName("head")[0].appendChild(script1);

    var link1 = document.createElement('link');
    link1.setAttribute('type', 'text/css');
    link1.setAttribute('rel', 'stylesheet/less');
    link1.setAttribute('href', '/++resource++mockup/less/iframe_init.less');
    document.getElementsByTagName("head")[0].appendChild(link1);

    var script3 = document.createElement('script');
    script3.setAttribute('type', 'text/javascript');
    script3.setAttribute('src', '/++resource++mockup/node_modules/less/dist/less-1.4.1.js');
    document.getElementsByTagName("head")[0].appendChild(script3);

  });

}(jQuery));
