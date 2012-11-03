// This script will register Plone's overlays for toolbar actions.
//
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


(function($, undefined) {
"use strict";

$(document).ready(function() {

  $.fn.ploneOverlay.defaults.formButtons = {
    // delete button on Delete form
    '.modal-body input.destructive': $.fn.ploneOverlay.defaultFormButton,
    '.modal-body input[name="form.button.Save"]': $.fn.ploneOverlay.defaultFormButton,
    '.modal-body input[name="form.button.Cancel"]': $.fn.ploneOverlay.defaultFormButton,
    '.modal-body input[name="form.button.Publish"]': $.fn.ploneOverlay.defaultFormButton,
    '.modal-body input[name="form.button.RenameAll"]': $.fn.ploneOverlay.defaultFormButton
  };

  // need redirect to different url after successfull submitting
  $.each([
    '#plone-toolbar #plone-contentmenu-actions > ul > li#delete > a',
    '#plone-toolbar #plone-contentmenu-actions > ul > li#rename > a'
  ], function(i, selector) {
    var el = $(this);
    $(selector).ploneOverlay({
      onShow: function() { el.dropdown('toggle'); },
      onAjaxSave: function(responseBody, state, xhr, form, button) {
        if (button.attr('name') !== 'form.button.Cancel') {
          console.log('redirect');
        }
      }
    });
  });

  $.each([
    '#plone-toolbar #plone-contentmenu-workflow > ul > li#advanced > a',
    '#plone-toolbar #plone-contentmenu-display > ul > li#folderChangeDefaultPage > a',
    '#plone-toolbar #plone-contentmenu-display > ul > li#contextSetDefaultPage > a'
  ], function(i, selector) {
    var el = $(this);
    $(selector).ploneOverlay({
      onShow: function() {
        el.dropdown('toggle');
      }
    });
  });

});

}(window.jQuery));
