// Helper functions for use in tests.
//
// @author Rok Garbas
// @version 1.0
// @licstart  The following is the entire license notice for the JavaScript
//            code in this page.
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// @licend  The above is the entire license notice for the JavaScript code in
//          this page.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  regexp:true, undef:true, strict:true, trailing:true, browser:true */
/*global $:false, window:false */


// creates element which will get picked by iframe.js script
function createIFrameReadyElement(name, resources, content, extra) {
  "use strict";

  return $('<div/>')
      .html(content)
      .appendTo('body')
      .attr(
        $.extend({
          'data-iframe': name,
          'data-iframe-resources': resources
        }, extra));
}

function onLoad(done, iframe, callable) {
  "use strict";

  function onLoadInner() {
    if (iframe.loaded === true) {
      done(callable.call);
      return;
    }
    window.setTimeout(onLoadInner, 23);
  }
  onLoadInner();
}
