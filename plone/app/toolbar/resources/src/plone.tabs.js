// Plone Tabs
// ==========
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/js/bootstrap-tab.js
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
      navClassName: 'nav nav-tabs',
      panes: 'fieldset',
      panesTitle: '> legend',
      panesClassName: 'tab-pane',
      panesWrappingClassName: 'tab-content',
      window: window.parent,
      document: window.parent.document
    }, options);

    // create tabs container
    self._tabs = $('<ul/>')
        .addClass(self.options.navClassName)
        .insertBefore($('fieldset', self.el).first());

    // generate tabs from fieldsets
    $(self.options.panes, self.el).each(function() {
      var fieldset = $(this),
          tab = $('' +
              '<li>' +
                '<a href="#' + fieldset.attr('id') + '" data-toggle="tab">' +
                  $(self.options.panesTitle, fieldset).html() +
                '</a>' +
              '</li>');

      self._tabs.append(tab);

      $(self.options.panesTitle, fieldset).hide();

      fieldset.addClass(self.options.panesClassName);

      $('> a', tab)
        .on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).tab('show');
        })
        .on('shown', function(e) {
          if (self.el.parents('.modal-wrapper').size() !== 0) {
            $('body', self.options.document).height(
                self.el.parents('.modal-wrapper').height() +
                self.el.parents('.modal-wrapper').offset().top);
          }
          if (self.el.parents('.modal-backdrop').size() !== 0) {
            self.el.parents('.modal-backdrop').height(
                $(self.options.window).height());
          }
        });

    }).wrapAll('<div class="' + self.options.panesWrappingClassName + '" />');

    // automaticaly select first tab
    $('a:first', self._tabs).tab('show');
  },

  getTab: function(i) {
    return $('li:eq(' + i + ') a', this._tabs);
  },

  getTabContent: function(i) {
    return $(this.options.panes + ':eq(' + i + ')', this.el);
  },

  show: function(i) {
    return this.getTab(i).tab('show');
  }

};


// # jQuery Integration
$.fn.ploneTabs = function(options) {
  var el = $(this);

  if (el.size() !== 1) { return; }

  var data = el.data('plone-tabs');
  if (data === undefined) {
    data = new $.plone.tabs.Constructor(el, options);
    el.data('plone-tabs', data);
  } else {
    $.extend(data.options, options);
  }

  return data;
};

// # Initialization
$.plone.init.register(function(context) {
  $('.enableFormTabbing', context).ploneTabs();
});

}(jQuery));
