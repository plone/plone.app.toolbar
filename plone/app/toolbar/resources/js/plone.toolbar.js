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


(function($, iframe, undefined) {
"use strict";

$(document).ready(function() {

  $('.toolbar-dropdown > a')
    .on('patterns.toggle.add', function(e) {
        var $el = $(this);
        $('.toolbar-dropdown-open > a').each(function() {
          if ($el[0] !== $(this)[0]) {
            $(this).patternToggle('remove');
          }
        });
        iframe.stretch();
      })
    .on('patterns.toggle.remove', function(e) {
      iframe.shrink();
    });

  // shrink iframe when click happens on toolbar and no dropdown is open at
  // that time
  iframe.registerAction(
    function(e) {
      return $('.toolbar-dropdown-open', e.target).size() !== 0;
    },
    function(e) {
      $('.toolbar-dropdown-open > a').each(function() {
        $(this).patternToggle('remove');
      });
      iframe.shrink();
    });

});

}(window.jQuery, window.jQuery.iframe));
