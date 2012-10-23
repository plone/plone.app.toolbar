// This plugin is used to handle all clicks inside toolbar iframe.
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

$.IFrame = function(el) { this._init(el); };
$.IFrame.prototype = {

  // # Initialization
  _init: function(el) {
    var self = this;

    self.el = el;
    self.state = null;

    // # on every click we shrink iframe
    $(document).on('click', function(e) {
      // TODO: we need to generalize all this
      //
      // in case of clicking on modal background or tinyMCE style dropdown we
      // shouldn't do anything
      if ($.nodeName(e.target, 'html')) {
        self.shrink();
      } else {
        if ($(e.target).parents('body').size() === 0 ||
            $(e.target).parents('.mceMenuItem').size() === 1 ||
            $(e.target).hasClass('modal-backdrop')) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          self.shrink();
        }
      }
    });

    // # Handle every click on every link inside current frame
    //
    // Currently script recognizes:
    //  - twitter bootstrap dropdown
    //  - ploneOverlay links
    $('a').on('click', function(e) {

      // only handle left(1) and right(2) click
      if (e.which === 1 || e.which === 2) {
        var el = $(this);

        // since we'll be handling this link we prevent any default behaivour
        e.preventDefault();

        // if link has twitter bootstrap dropdown assigned to it then make sure
        // current frame gets streched invisibly just in case dropdown goes over
        // the area of top frame.
        if (el.attr('data-toggle') === 'dropdown') {
          self.stretch();

        // TODO: rewrite
        // if ploneOverlay is registered for currently clicked link then we make
        // sure that iframe is stretched before being open and shrank on closing
        // if none of above conditions is met then open link in top frame or new
        // window in case right button was used
        } else if (el.data('plone-overlay') === undefined) {
          if (e.which === 1) {
            window.parent.location.href = el.attr('href');
          } else {
            window.parent.open(el.attr('href'));
          }
        }
      }
    });

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
      if (self.el.css('position') === 'fixed') {
        self.el.top = 0;
        self.el.left = 0;
      } else {
        var offset = self.el.offset();
        self.el.top = offset.top;
        self.el.left = offset.left;
      }
      self.el.css({
        height: $(window.parent.document).height(),
        top: 0,
        left: 0
      });
    }
  }

};

if (window.parent.iframe !== undefined && window.name &&
    window.parent.iframe[window.name] !== undefined) {
  $.iframe = new $.IFrame($(window.parent.iframe[window.name].el));
}

}(jQuery));
