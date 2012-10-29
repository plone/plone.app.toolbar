// tests for jquery.mask.js script.
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
/*global buster:false, jQuery:false, */

(function($, undefined) {
"use strict";

var testCase = buster.testCase,
    assert = buster.assert;


testCase("jquery.mask.js", {

  setUp: function() {
    this.timeout = 2000;
    $.extend($.mask.config, {
        window: window,
        document: document
      });
  },

  tearDown: function() {
    $.mask.close();
    $.mask.getMask().remove();
  },

  //  --- tests --- //

  "basic loading and closing of mask": function(done) {
    $.mask.load({
      onLoad: function() {
        assert($('#exposeMask').size() === 1);
        assert($('#exposeMask').css('display') === 'block');
        assert($.mask.isLoaded('full') === true);
        $.mask.close();
      },
      onClose: function() {
        assert($('#exposeMask').css('display') === 'none');
        done();
      }
    });
  },

  "closing on pressing esc": function(done) {
    $.mask.load({
      closeOnEsc: true,
      onLoad: function() {
        $(document).trigger({
          type: 'keydown',
          keyCode: 27
        });
      },
      onClose: function() {
        assert(true);
        done();
      }
    });
  },

  "closing on clicking": function(done) {
    $.mask.load({
      closeOnClick: true,
      onLoad: function() {
        $.mask.getMask().trigger('click.mask');
      },
      onClose: function() {
        assert(true);
        done();
      }
    });
  },

  "resizing window should make sure": function(done) {
    var spy_fit = this.spy($.mask, "fit");
    $.mask.load({
      onLoad: function() {
        $(window).trigger('resize');
        assert.called(spy_fit);
        done();
      }
    });

  },

  "if we pass string as config this should set color on mask": function(done) {
    $.mask.config.onLoad = function() {
      assert($.mask.getMask().css('background-color') === 'rgb(51, 51, 51)');
      done();
    };
    $.mask.load('rgb(51, 51, 51)');
  }


});

}(jQuery));
