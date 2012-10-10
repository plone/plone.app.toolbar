// Plone Init
// =============
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
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
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global InitializedTinyMCEInstances:false, tinyMCE: false,
  TinyMCEConfig:false, jQuery:false */

(function($) {
"use strict";

// # Namespace
$.plone = $.plone || {};
$.plone.init = $.plone.init || { _items: [] };


// # Register
$.plone.init.register = function(callback) {
  $.plone.init._items.push(callback);
};


// # jQuery Integration
$.fn.ploneInit = function() {
  var self = this;
  $.each($.plone.init._items, function(i, callable) {
    callable.apply(self, [self]);
  });
};


// # Initial initialization
$(document).ready(function() {
  $(document).ploneInit();
});


// ------------------------------------------------------------------------- //


// # Initialize TinyMCE
$.plone.init.register(function(context) {
  var modal = context.hasClass('modal') ? context : context.parents('.modal');
  $('textarea.mce_editable', context).each(function() {
    var el = $(this),
        buttons = [],
        content_css = [],
        config = eval('(' + el.attr('title') + ')'),
        id = 'mce_editable-' + new Date().getTime();
    $(el).attr('id', id);

    // filter out buttons we dont allow
    $.each(config.buttons, function(i, button) {
      // probably it would be nice that the list of buttons below would be
      // possible to configure
      if ($.inArray(button, ["style", "bold", "italic", "justifyleft",
          "justifycenter", "justifyright", "justifyfull", "bullist",
          "numlist", "definitionlist", "outdent", "indent", "link",
          "unlink", "code"]) !== -1) {
        // not sure about "anchor", "fullscreen"
        buttons.push(button);
      }
    });

    // copy css from top frame to content frame of tinymce
    // FIXME: its not copying style elements with css using @import
    $('link,style', window.parent.document).each(function(i, item) {
      if ($.nodeName(item, 'link') && $(item).attr('href')) {
        content_css += ',' + $(item).attr('href');
      } else if ($.nodeName(item, 'style') && $(item).attr('src')) {
        content_css += ',' + $(item).attr('src');
      }
    });

    config.buttons = buttons;
    config.content_css = content_css;
    el.attr('rows', '8');  // set height
    el.attr('title', JSON.stringify(config));

    $.plone.tinymce = $.plone.tinymce || {};

    // not sure if this is ebve
    if (modal.size() !== 0) {
      modal.on('shown', function() {
        var mce_config = new TinyMCEConfig(id);
        delete InitializedTinyMCEInstances[id];
        mce_config.init();
        $.plone.tinymce.menuStylePosition = undefined;
      });
      modal.on('hide', function() {
        tinyMCE.execCommand('mceRemoveControl', false, id);
        $.plone.tinymce.menuStylePosition = undefined;
      });
    }
  });
});

// # Initialize Bootstrap Datepicker
$.plone.init.register(function(context) {
  $('.plone-jscalendar-popup', context).each(function() {
    var el = $(this), date = new Date(),
        base_id = el.attr('id').substr(0, el.attr('id').length - 6);

    if (el.parent().find('#' + base_id + '_year').val() === '0000') {
      date = '' +
        date.getFullYear() + '-' +
        (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) + '-' +
        (date.getDate() < 10 ? '0' : '') + date.getDate();
    } else {
      date = '' +
        el.parent().find('#' + base_id + '_year').val() + '-' +
        el.parent().find('#' + base_id + '_month').val() + '-' +
        el.parent().find('#' + base_id + '_day').val();
    }

    $('img', el)
      .attr('data-date', date)
      .datepicker({ format: 'yyyy-mm-dd', autoclose: true })
      .on('changeDate', function(e){
        el.parent().find('#' + base_id + '_year').val(e.date.getFullYear());
        el.parent().find('#' + base_id + '_month').val(
          e.date.getMonth() < 9 ? '0' + (e.date.getMonth() + 1)
                                : e.date.getMonth() + 1);
        el.parent().find('#' + base_id + '_day').val(
          e.date.getDate() < 10 ? '0' + e.date.getDate() : e.date.getDate());
      });

    // update datepicker on dropdown change
    el.parent().find('#' + base_id + '_year,' +
                     '#' + base_id + '_month,' +
                     '#' + base_id + '_day').on('change', function(e) {
      $('img', el).data('date', '' +
          el.parent().find('#' + base_id + '_year').val() + '-' +
          el.parent().find('#' + base_id + '_month').val() + '-' +
          el.parent().find('#' + base_id + '_day').val())
        .datepicker('update');
    });

    el.show();

  });
});
}(jQuery));
