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

// set of ids where overlay code should be triggered on.
$.plone.cmsui._basic_overlays = [
  'plone-action-contentrules',
  'plone-action-local_roles',
  'advanced',
  'folderChangeDefaultPage',
  'contextSetDefaultPage',
  'plone-personal-actions-plone_setup'
];

// ## Forms helper {{{
$.plone.cmsui.overlay_form_transform = function(overlay, data, options) {

  options = $.extend({
    title_selector: 'h1.documentFirstHeading',
    content_selector: '#content',
    buttons_selector: '.formControls > input[type=submit]',
    cancel_buttons: [
      "input[name='buttons.cancel']",
      "input[name='form.button.Cancel']",
      "input[name='form.button.cancel']",
      "input[name='form.actions.cancel']"
      ]
    }, options || {});

  overlay.title.html('');
  overlay.title.append($(options.title_selector, data).html());

  // copy content from data into overlay
  overlay.body.html($(options.content_selector, data).html());

  var has_form = $('form', $(options.content_selector, data)).length > 0;

  if(has_form) {
    // set form attributes to form attributes in overlay
    overlay.form.addClass('form-horizontal');
    $.each($('form', $(options.content_selector, data))[0].attributes,
      function(i, attr) {
        overlay.form.attr(attr.name, attr.value);
      });

    // trigger tinymce
    // TODO: for some reason i couldn't get wysiwyg widget to add correct
    // class for this textarea
    // So look for the text format options, check that html is selected
    $('.fieldTextFormat option[value="text/x-plone-outputfilters-html"]').each(addEditor);
  }

  // tabs (ala twitter bootstrap)

  var tabs = $('<ul class="nav nav-tabs"></ul>'),
      tabs_content = $('<div class="tab-content">'),
      fieldsets = $('fieldset', overlay.body);
  fieldsets.each(function(i, fieldset) {
    fieldset = $(fieldset);
    tabs.append($('<li/>').append(
      $('<a/>').attr('href', '#' + fieldset.attr('id'))
        .html($('legend', fieldset).hide().html())
        .on('click', function(e) {
          e.preventDefault();
          $(this).tab('show').blur();
        })
      ));
    tabs_content.append($('<div>').addClass('tab-pane')
      .attr('id', fieldset.attr('id'))
      .html(fieldset.html()));
    fieldset.remove();
  });
  if (fieldsets.size() > 0) {
    $(overlay.body).prepend(tabs_content).prepend(tabs);
  }

  $('a', tabs).tab();
  $('a', tabs).first().tab('show');


  // copy buttons to modal-footer
  overlay.buttons = $('<div class="pull-right"/>');
  overlay.footer.html('');
  overlay.footer.append(overlay.buttons);
  $(options.buttons_selector, overlay.body).each(function(i, button) {
    button = $(button);
    button.addClass('btn');
    if (button.hasClass('context')) {
      button.addClass('btn-primary');
    }
    overlay.buttons.append(button);
  });

  // change note should be in footer
  var change_note = $('#cmfeditions_version_comment_block', overlay.body);
  if (change_note.size() !== 0) {
    $('input', change_note)
      .attr('placeholder', $('.formHelp', change_note).text().trim())
      .appendTo($('<div class="pull-left"/>')
        .appendTo(overlay.footer));
    change_note.remove();
  }

  // cancel buttons should close overlay
  $.each(options.cancel_buttons, function(i, selector) {
    var button = $(selector, overlay.footer);
    button.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.modal('hide');
    });
  });
};
// }}}

// }}}

// # Actions {{

// ## Contents (folder_contents) {{{
// FIXME: not working
$(document).on('plone_toolbar.plone-action-folderContents', function(e, link) {
  //var self = this;
  var overlay = $(link).ploneOverlay();
  overlay.load(function(data) {
    $.plone.cmsui.overlay_form_transform(overlay, $('#portal-columns #portal-column-content', data));
  });


  //$('#folderlisting-main-table a', self.body).each(function(){

      //// Remove any parameters from the url
      //var href = $(this).attr('href');
      //var base_href = (href.match(/^([^?]+)/)||[])[1];

      //if(base_href.match(/\/folder_contents$/)){
          //var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
              //.attr('href', $(this).attr('href').replace(/\/folder_contents$/, ''))
              //.attr('class', 'viewlink')
              //.attr('target', '_parent')
              //.attr('title', 'Open here'); // Needs i18n!
          //$(this).parent().append(viewlink);
      //} else if (base_href.match(/\/folder_position$/)){
          //// Do nothing, the default click handler already keeps
          //// the result in the overlay
      //} else if (base_href.match(/\/folder_contents$/)) {
          //// It has parameters, leave it alone
      //} else {
          //// Replace click handler
          //$(this).off('click');
          //$(this).on('click', function(e){
             //window.parent.location.href = $(e.target).attr('href');
          //});
      //}
  //});

  //// Add an "Open here" link at the top
  //var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
      //.attr('href', e.href.replace(/\/folder_contents$/, ''))
      //.attr('class', 'viewlink')
      //.attr('target', '_parent')
      //.attr('title', 'Open here'); // Needs i18n!
  //$('h1.documentFirstHeading').append(viewlink);

  //// Keep forms inside the overlay by placing result of form submission
  //// back into the overlay and calling overlay_setup again.
  //$('form').ajaxForm({
      //success: function (responseText){
          //var modal = $('#toolbar-overlay'),
              //body = $('.modal-body', modal),
              //selector = '#portal-column-content > *';
          //// strip inline script tags
          //responseText = responseText.replace(/<script(.|\s)*?\/script>/gi, "");
          //var res = $('<div />').append(responseText)
              //.find(selector);
          //body.empty().append(res);
          //overlay_setup(modal, body, 'toolbar-button-folderContents', e.href, selector);
          //return false;
      //}
  //});

  //// Fix breadcrumbs to go to folder_contents
  //$('#toolbar-overlay #portal-breadcrumbs a').each(function(){
      //$this = $(this);
      //$this.attr('href', $this.attr('href') + '/folder_contents');
  //});

});
// }}}

// TODO: bellow i listed action which i think we should implement, i might,
// and i probably did, also forgot some.

// ## Edit {{{
$(document).on('plone_toolbar.plone-action-edit', function(e, link) {
  var overlay = $(link).ploneOverlay();
    overlay.load(function(data) {

    $.plone.cmsui.overlay_form_transform(overlay,
        $('#portal-columns #portal-column-content', data));

    // hide overlay and trigger deco
    if ($('[data-iframe="deco-toolbar"]', window.parent.document).size() > 0) {
      overlay.options = { show: false };
      var deco_toolbar = $(overlay.el).ploneDecoToolbar();
      if (deco_toolbar.visible === false) {
        deco_toolbar.activate();
      } else {
        deco_toolbar.deactivate();
      }
    }
  });
});
// }}}

// ## Actions -> Cut
// ## Actions -> Paste
// ## Actions -> Delete
// ## Actions -> Rename

// setup simple overlays
for(var i=0; i<$.plone.cmsui._basic_overlays.length; i++){
  var id = $.plone.cmsui._basic_overlays[i];
  $(document).on('plone_toolbar.' + id, function(e, link){
    var overlay = $(link).ploneOverlay();
    overlay.load(function(data) {
      $.plone.cmsui.overlay_form_transform(overlay, $('#portal-columns #portal-column-content', data));
    });
  });
}

// ## Add forms {{{
// FIXME: not working
$(document).on('plone_toolbar.plone-contentmenu-factories', function(e, link){
  var overlay = $(link).ploneOverlay();
  overlay.load(function(data) {
    $.plone.cmsui.overlay_form_transform(overlay, $('#portal-columns #portal-column-content', data));
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
});
// }}}

// ## State: ??? -> Publish, Submit for publication, Retract, Send back
// ## State: ??? -> Advanced...

// ## Personal -> Preferences
// ## Personal -> Site Setup

}(jQuery));
