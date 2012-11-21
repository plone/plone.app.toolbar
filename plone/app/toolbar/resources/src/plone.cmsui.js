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

  // Delete Action
  $('#plone-toolbar #plone-contentmenu-actions > ul > li#delete > a').ploneOverlay({
    onShow: function() { $(this).dropdown('toggle'); },
    formButtons: {
      '.modal-body input[name="form.button.Cancel"]':
          $.fn.ploneOverlay.defaultFormButton(),
      '.modal-body input.destructive':
          $.fn.ploneOverlay.defaultFormButton({
            onSave: function(response, state, xhr, form, button) {
              // need redirect to different url after successfull submitting
              console.log('redirect');
            }
      })
    }
  });

  // Rename Action
  $('#plone-toolbar #plone-contentmenu-actions > ul > li#rename > a').ploneOverlay({
    onShow: function() { $(this).dropdown('toggle'); },
    formButtons: {
      '.modal-body input[name="form.button.Cancel"]':
          $.fn.ploneOverlay.defaultFormButton(),
      '.modal-body input[name="form.button.RenameAll"]':
          $.fn.ploneOverlay.defaultFormButton({
            onSave: function(response, state, xhr, form, button) {
              // need redirect to different url after successfull submitting
              console.log('redirect');
            }
      })
    }
  });

  // Workflow -> Advance
  $('#plone-toolbar #plone-contentmenu-workflow > ul > li#advanced > a').ploneOverlay({
    onShow: function() { $(this).dropdown('toggle'); },
    formButtons: {
      '.modal-body input[name="form.button.Cancel"]': $.fn.ploneOverlay.defaultFormButton(),
      '.modal-body input[name="form.button.Save"]': $.fn.ploneOverlay.defaultFormButton()
    }
  });

  // Display View -> Select default content as default view
  $('#plone-toolbar #plone-contentmenu-display > ul > li#contextSetDefaultPage > a').ploneOverlay({
    onShow: function() { $(this).dropdown('toggle'); },
    formButtons: {
      '.modal-body input[name="form.button.Cancel"]': $.fn.ploneOverlay.defaultFormButton(),
      '.modal-body input[name="form.button.Save"]': $.fn.ploneOverlay.defaultFormButton()
    }
  });

  //
  $('#plone-toolbar #plone-contentmenu-display > ul > li#folderChangeDefaultPage > a').ploneOverlay({
    onShow: function() { $(this).dropdown('toggle'); },
    formButtons: {
      '.modal-body input[name="form.button.Cancel"]': $.fn.ploneOverlay.defaultFormButton(),
      '.modal-body input[name="form.button.Save"]': $.fn.ploneOverlay.defaultFormButton()
    }
  });


});

}(window.jQuery));
