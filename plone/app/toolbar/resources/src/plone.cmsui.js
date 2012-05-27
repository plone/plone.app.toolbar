// This script is used to provide glue code between iframed and twitter
// bootstrap modal. And also providing some convinience method for usage in
// Plone.
//
//
// @author Rok Garbas, Izak Burger
// @version 0.1
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
/*global TinyMCEConfig:false, jQuery:false */


(function($) {
"use strict";

// TODO: should be moved out of here
function addEditor(){
  var text = $(this).parent().parent().next().find('textarea');
  var id = Math.floor(Math.random()*11) + '';
  text.attr('id', id);
  var config = new TinyMCEConfig(id);
  config.init();
}

// # Namespace
$.plone = $.plone || {};
$.plone.cmsui = $.plone.cmsui || {};

// # Bootstrap Overlay Transform
$.plone.cmsui.bootstrapOverlayTransform = function(modal, loaded, options) {
  var title = $('.modal-header > h3', modal),
      body = $('.modal-body',modal),
      footer = $('.modal-footer', modal);

  options = $.extend({
    title: 'h1.documentFirstHeading',
    body: '#content',
    footer: '.formControls',
    close: 'input[name="buttons.cancel"],' +
      'input[name="form.button.Cancel"],' +
      'input[name="form.button.cancel"],' +
      'input[name="form.actions.cancel"]'
    }, options || {});

  // Title
  title.html($(options.title, loaded).html());

  // Footer
  footer.html($(options.footer, loaded).html());

  // Content
  body.html($(options.body, loaded).html());
  $(options.title, body).remove();
  $(options.footer, body).remove();

  // Closing buttons (eg: on Cancel buttons of form)
  $(options.close, modal).on('click', function(e) {
    $(modal).modal('hide');
  });

  // ## Form (only if included in body of modal)
  var body_form = $('> div > form', body);
  if (body_form.size() === 1) {
    // copy all attributed to form which will wrap
    var form = $('<form/>');
    $.each(body_form[0].attributes, function(i, attr) {
      form.attr(attr.name, attr.value);
    });
    form.addClass('modal-form');
    modal.wrap(form);  // wrap modal with new form
    body_form.children(':first-child').unwrap();  // remove form from modal's body

    // trigger tinymce
    // TODO: for some reason i couldn't get wysiwyg widget to add correct
    // class for this textarea
    // So look for the text format options, check that html is selected
    $('.fieldTextFormat option[value="text/x-plone-outputfilters-html"]', modal).each(addEditor);
  }

};

// # Toolbar Actions
// setup simple overlays
// set of ids where overlay code should be triggered on.
$.plone.cmsui._basic_overlays = [
  'plone-action-contentrules',
  'plone-action-local_roles',
  'advanced',
  'folderChangeDefaultPage',
  'contextSetDefaultPage',
  'plone-personal-actions-plone_setup'
];
for(var i=0; i<$.plone.cmsui._basic_overlays.length; i+=1){
  $('#plone-toolbar ul.nav > li#' + $.plone.cmsui._basic_overlays[i] + ' a').ploneOverlay({
    after_load: function() {
        var overlay = this;
        $.plone.cmsui.bootstrapOverlayTransform(overlay.el, overlay.loaded_data);
      }
  });
}
// ## Contents (folder_contents)
$('#plone-toolbar ul.nav > li#plone-action-folderContents a').ploneOverlay({
  after_load: function() {
    var overlay = this;
    $.plone.cmsui.bootstrapOverlayTransform(overlay.el, overlay.loaded_data);
    // TODO: need to continue and make it working
  }
});
// ## Edit
$('#plone-toolbar ul.nav > li#plone-action-edit a').ploneOverlay({
  after_load: function() {
    var overlay = this;
    if ($('[data-iframe="deco-toolbar"]', window.parent.document).size() > 0) {
      var deco_toolbar = $(overlay.el).ploneDecoToolbar();
      if (deco_toolbar.visible === false) {
        deco_toolbar.activate();
      } else {
        deco_toolbar.deactivate();
      }
    } else {
      $.plone.cmsui.bootstrapOverlayTransform(overlay.el, overlay.loaded_data);
    }
  }
});
// ## Actions -> Cut
// ## Actions -> Paste
// ## Actions -> Delete
// ## Actions -> Rename
// ## Add forms
$('#plone-toolbar ul.nav > li#plone-contentmenu-factories a').ploneOverlay({
  after_load: function() {
    var overlay = this;
    $.plone.cmsui.bootstrapOverlayTransform(overlay.el, overlay.loaded_data);
  }
});
  // Submit form using ajax, then close modal and reload parent
  // var modal = $('#toolbar-overlay', toolbar.document),
  //     body = $('.modal-body', modal);
  // $('form', body).ajaxForm({
  //     success: function() {
  //         modal.modal('hide');
  //         body.empty();
  //         window.parent.location.replace(window.parent.location.href);
  //     }
  // });

// ## State: (Some State) -> Publish, Submit for publication, Retract, Send back
// ## State: (Some Sate) -> Advanced...
// ## Personal -> Preferences
// ## Personal -> Site Setup

}(jQuery));
