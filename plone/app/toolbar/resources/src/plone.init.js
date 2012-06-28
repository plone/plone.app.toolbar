// Plone Init
// =============
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
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
  undef:true, strict:true, trailing:true, browser:true */
/*global TinyMCEConfig:false, jQuery:false */

(function($) {
"use strict";

// # Namespace
$.plone = $.plone || {};
$.plone.init = $.plone.init || { _items: [] };


// # Register
$.plone.init.register = function(callback) {
  $.plone.init._items.push(callback);
};


// # jQuery Integration
$.fn.ploneInit = function() {
  var self = this;
  $.each($.plone.init._items, function(i, callable) {
    callable.apply(self, [self]);
  });
};


// Initialization
$(document).ready(function() {
  $(document).ploneInit();
});


// # Register TinyMCE
// TODO: move this to tine_mce_init.js
$.plone.init.register(function(context) {
  $('textarea.mce_editable', context).each(function() {
    var el = $(this),
        id = Math.floor(Math.random() * 11) + '';
    $(el).attr('id', id);

    var config = new TinyMCEConfig(id);
    //delete InitializedTinyMCEInstances[id];
    config.init();

  });
});

}(jQuery));
