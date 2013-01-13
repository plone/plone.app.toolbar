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

$.IFrame = function(iframe) { this._init(iframe); };
$.IFrame.prototype = {

  // # Initialization
  _init: function(iframe) {
    var self = this;

    self._iframe = iframe;
    self.$el = $(iframe.el);
    self.window = window.parent;
    self.document = window.parent.document;
    self._state = null;
    self._actions = [];

    // # Handle clicks inside iframe
    $(document).on('click', function(e) {
      var condition = false;

      // see if there is any link action registered to handle this click
      $.each(self._actions, function(i, item) {
        if (item[0].apply(this, [e, self])) {
          item[1].apply(this, [e, self]);
        }
      });

    });

    // register common actions

    // which opens link in top frame if clicked on
    self.registerAction(
      function(e) {
        return ($.nodeName(e.target, 'a') ||
                $(e.target).parents('a').size() === 1);
      },
      function(e) {
        e.stopPropagation();
        e.preventDefault();
        var url = $(e.target).attr('href');
        if (!$.nodeName(e.target, 'a')) {
          url = $(e.target).parents('a').attr('href');
        }
        if (e.which === 1) {
          self._window_location(url);
        } else if (e.which === 2) {
          self._window_open(url);
        }
      });

    // shrink iframe when click happens on stretched & transparent part of iframe
    self.registerAction(
        function(e) { return $.nodeName(e.target, 'html'); },
        function(e) { self.shrink(); });

    $(self.window).on('resize', function(e) {
      self.fit();
    });
  },

  // Abstract calls to window.parent so its easier to stub/mock in tests
  _window_location: function(url) {
    this.window.location.href = url;
  },

  _window_open: function(url) {
    this.window.open(url);
  },

  registerAction: function(condition, action) {
    this._actions.push([ condition, action ]);
  },

  // # Shrink IFrame Object
  //
  // Shrink current frame to the size that was before stretching it.
  shrink: function() {
    var self = this;
    if (self._state !== null) {
      self.$el.css(self._state);
      self._state = null;
    }
  },

  // # Stretch IFrame Object
  //
  // This function stretches current frame over whole top frame while keeping
  // iframe object trasparent
  stretch: function() {
    var self = this;
    if (self._state === null) {
      var offset = self.$el.offset();

      self._state = {};
      self._state.top = offset.top;
      self._state.left = offset.left;
      self._state.height = self.$el.height();

      self.$el.css({
        top: 0,
        left: 0,
        height: $(self.document).height()
      });
    }
  },

  // # Toggle IFrame Object
  //
  // This function check in which state current object is and calls appropriate
  // action (stretch or shrink)
  toggle: function() {
    var self = this;
    if (self._state === null) {
      self.stretch();
    } else {
      self.shrink();
    }
  },

  fit: function() {
    var self = this;
    if (self._state !== null) {
      self._state.height = $(document).height();
    }
    self.$el.css('height', $(document).height());
  }

};

if (window.parent.iframe !== undefined && window.name &&
    window.parent.iframe[window.name] !== undefined) {
  $.iframe = new $.IFrame(window.parent.iframe[window.name]);
}

}(window.jQuery));
