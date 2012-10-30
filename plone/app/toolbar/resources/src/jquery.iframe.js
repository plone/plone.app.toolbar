// This plugin is used to handle all clicks inside iframe.
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
/*global jQuery:false, define:false */


(function($, undefined) {
"use strict";

// TODO: need find place to implement action for below conditions
//
// if ($.nodeName(e.target, 'html')) {
//   self.shrink();
//
// if ($(e.target).parents('body').size() === 0 ||
//        $(e.target).parents('.mceMenuItem').size() === 1 ||
//        $(e.target).hasClass('modal-backdrop')) {
//   e.preventDefault();
//   e.stopPropagation();
//
// if (el.attr('data-toggle') === 'dropdown') {
//   self.stretch();

$.IFrame = function(iframe) { this._init(iframe); };
$.IFrame.prototype = {

  // # Initialization
  _init: function(iframe) {
    var self = this;

    self._iframe = iframe;
    self.el = iframe.el;
    self.window = iframe.window;
    self.document = iframe.document;
    self.state = null;
    self.clickActions = [];

    // # Handle clicks inside iframe
    $(document).on('click', function(e) {
      var el = $(e.target),
          condition = false;

      // see if there is any link action registered to handle this click
      $.each(self.clickActions, function(i, item) {
        condition = item[0].apply(this, [e, self]);
        if (condition === true) {
          item[1].apply(this, [e, self]);
          return;
        }
      });

      // if no condition was met then handle click in top frame
      if (condition === false) {
        if ($.nodeName(el[0], 'a')) {
          if (e.which === 1) {
            self._window_location(el.attr('href'));
          } else if (e.which === 2) {
            self._window_open(el.attr('href'));
          }
        }
      }

    });
  },

  // Abstract calls to window.parent so its easier to stub/mock in tests
  _window_location: function(url) {
    window.parent.location.href = url;
  },

  _window_open: function(url) {
    window.parent.open(url);
  },

  // # Shrink IFrame Object
  //
  // Shrink current frame to the size that was before stretching it.
  shrink: function() {
    var self = this;
    if (self.state !== null) {
      self.el.css(self.state);
      self.state = null;
    }
  },

  // # Stretch IFrame Object
  //
  // This function stretches current frame over whole top frame while keeping
  // iframe object trasparent
  stretch: function() {
    var self = this;
    if (self.state === null) {
      self.state = {};
      self.state.height = self.el.height();

      var offset = self.el.offset();
      self.el.top = offset.top;
      self.el.left = offset.left;

      self.el.css({
        top: 0,
        left: 0,
        height: $(window.parent.document).height()
      });
    }
  }

};

if (window.parent.iframe !== undefined && window.name &&
    window.parent.iframe[window.name] !== undefined) {
  $.iframe = new $.IFrame($(window.parent.iframe[window.name]));
}

}(jQuery));
