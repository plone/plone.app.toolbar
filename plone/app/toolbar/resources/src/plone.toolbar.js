// 
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/bootstrap/bootstrap-dropdown.js
//    ++resource++plone.app.toolbar/src/jquery.iframe.js
//
// Description:
//
// License:
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

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */


(function($, undefined) {
"use strict";

$(document).ready(function() {

  // shrink / stretch iframe when dropdown happens in toolbar
  $('body')
      .on('click.dropdown.data-api touchstart.dropdown.data-api',
        '#plone-toolbar [data-toggle=dropdown]', function(e) {
          if ($.iframe._state !== null &&
              $('.dropdown.open', $(e.target).parents('#plone-toolbar')).size() === 0) {
            $.iframe.shrink();
          } else if ($.iframe._state === null) {
            $.iframe.stretch();
          }
        });


  // shrink iframe when click happens on toolbar and no dropdown is open at
  // that time
  $.iframe.registerAction(
      function(e) { return $('.dropdown.open', e.target).size() === 0; },
      function(e) { $.iframe.shrink(); });


// TODO:
// if ($(e.target).parents('body').size() === 0 ||
//        $(e.target).parents('.mceMenuItem').size() === 1 ||
//        $(e.target).hasClass('modal-backdrop')) {
//   e.preventDefault();
//   e.stopPropagation();
//


});

}(window.jQuery));
