// Plone Tabs
// ==========
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/js/bootstrap-tab.js
//    ++resource++plone.app.toolbar/src/plone.init.js
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
$.plone.tabs = $.plone.tabs || {};


// Tabs Class
$.plone.tabs.Constructor = function(el, options) { this.init(el, options); };
$.plone.tabs.Constructor.prototype = {
  init: function(el, options) {
    var self = this;
    self.el = el;

    self.options = $.extend({
    }, options);

    // create tabs container
    self.navTabs = $('<ul class="nav nav-tabs" />')
        .insertBefore($('fieldset', self.el).first());

    // generate tabs from fieldsets
    $('fieldset', self.el).each(function() {
      var fieldset = $(this),
          tab = $('' +
              '<li>' +
                '<a href="#' + fieldset.attr('id') + '" data-toggle="tab">' +
                  $('> legend', fieldset).html() +
                '</a>' +
              '</li>');

      self.navTabs.append(tab);

      $('> legend', fieldset).hide();

      fieldset.addClass('tab-pane');

      $('> a', tab)
        .on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).tab('show');
        })
        .on('shown', function(e) {
          $('body', window.parent.document).height(
                self.el.parents('.modal-wrapper').height() +
                self.el.parents('.modal-wrapper').offset().top);
          self.el.parents('.modal-backdrop').height($(window.parent).height());
        });

    }).wrapAll('<div class="tab-content" />');

    self.el.parents('.modal').on('shown', function(e) {
      $('a', self.navTabs).first().tab('show');
      $(this).off('shown');
    });

  }
};


// # jQuery Integration
$.fn.ploneTabs = function(options) {
  var el = $(this),
      data = el.data('plone-tabs');

  if (el.size() === 0) { return; }

  if (data === undefined) {
    data = new $.plone.tabs.Constructor(el, options);
    el.data('plone-tabs', data);
  }

  return data;

};

// # Initialization
$.plone.init.register(function(context) {
  $('.enableFormTabbing', context).ploneTabs();
});

}(jQuery));
