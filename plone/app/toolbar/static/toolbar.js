
(function($) {
  "use strict";

  $(document).ready(function() {

    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', '++resource++mockup/jam/require.js');
    script.onload = function() {
      requirejs.config({ baseUrl: '++resource++mockup/' });
      window.require(['js/bundles/toolbar'], function(Widgets) {
        Widgets.scan('body');
      });
    };
    document.getElementsByTagName("head")[0].appendChild(script);

  });

}(jQuery));

