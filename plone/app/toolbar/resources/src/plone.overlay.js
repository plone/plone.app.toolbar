// overlay for plone based on bootstrap modal
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/jquery.form.js
//    ++resource++plone.app.toolbar/src/plone.init.js
//    (optional)++resource++plone.app.toolbar/src/jquery.iframe.js
//    (optional)++resource++plone.app.toolbar/src/jquery.mask.js
//
// Description: 
//    This script is used to provide glue code between iframe and twitter
//    bootstrap modal. And also providing some convinience method for usage in
//    Plone.
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
/*global tinyMCE:false, TinyMCEConfig:false, jQuery:false */


(function($, undefined) {
"use strict";


// Reserve namespace
$.plone = $.plone || {};
$.plone.overlay = $.plone.overlay || {};


// Defaults
$.plone.overlay.defaults = {
  window: window.parent,
  document: window.parent.document,
  mask: $.mask || undefined,
  urlPrefix: '++unthemed++',

  // hooks
  onInit: undefined,
  onBeforeLoad: undefined,
  onLoad: undefined,
  onShow: undefined,
  onHide: undefined,
  onDestroy: undefined,

  // adding prefix to url (after domain part)
  addPrefixToURL: function(url, prefix) {
    // TODO: we should add it after plone site url (head>base)
    if (url.indexOf('http') === 0) {
      return url.replace(/^(https?:\/\/[^\/]+)\/(.*)/, '$1/++unthemed++/$2');
    } else if (url.indexOf('/') === 0) {
      return window.location.protocol + '//' +
              window.location.host + '/++unthemed++' + url;
    } else {
      return window.location.protocol + '//' +
              window.location.host + '/++unthemed++' +
              window.location.pathname + '/' + url;
    }
  },

  // template for overlay
  modalTemplate: function(content, options) {
    var self = this,
        el = $('' +
          '<div class="modal fade">' +
          '  <div class="modal-header">' +
          '    <a class="close" data-dismiss="modal">&times;</a>' +
          '    <h3>Title</h3>' +
          '  </div>' +
          '  <div class="modal-body">Content</div>' +
          '  <div class="modal-footer">Buttons</div>' +
          '</div>'),
        title = $('.modal-header > h3', el),
        body = $('.modal-body', el),
        footer = $('.modal-footer', el);

    // Merge options
    options = $.extend({
      title: 'h1.documentFirstHeading',
      body: '#content',
      footer: '.formControls',
      cancel: 'input[name="buttons.cancel"],' +
            'input[name="form.button.Cancel"],' +
            'input[name="form.button.cancel"],' +
            'input[name="form.actions.cancel"],' +
            '.modal-header [data-dismiss="modal"]'
    } , options || {});

    // Title
    title.html($(options.title, content).html());

    // Footer
    footer.html($(options.footer, content).html());

    // Content
    body.html($(options.body, content).html());
    $(options.title, body).remove();
    $(options.footer, body).remove();

    // Cancel buttons
    $(options.cancel, el).on('click', function(e) {
      self.destroy();
    });

    return el;
  },

  // FIXME
  modalOptions: {
    backdrop: 'static',
    keyboard: true,
    dynamic: true
  },

  // FIXME
  form: 'form#form,form[name="edit_form"]',

  // FIXME
  form_options: {
    beforeSerialize: function(form, options) {
      // save tinymce text to textarea
      var textarea = $('.mce_editable', form),
          textarea_id = textarea.attr('id');
      if (textarea.size() !== 0 &&
          tinyMCE.editors[textarea_id] !== undefined) {
        tinyMCE.editors[textarea_id].save();
        tinyMCE.editors[textarea_id].remove();
      }
    },
    success: function(response, state, xhr, form) {
      var oldel = self.el,
          response_body = $('<div/>').html(
              (/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);

      if ($('dl.portalMessage.error', response_body).size() !== 0) {
        self.el = response_body;
        if (self.options.el !== undefined) {
          self.el = $(self.options.el, self.el);
        }
        oldel.remove();
        self._initel();
        self.show();
      } else {
        if (self.options.save !== undefined) {
          self.options.save.apply(self, [ response_body, state, xhr, form ]);
        }
      }
    }
  }

};


// Constructor
$.plone.overlay.Constructor = function(options) { this._init(options); };
$.plone.overlay.Constructor.prototype = {
  _init: function(options) {
    var self = this;

    // define custom options
    self.options = $.extend(true, $.plone.overlay.defaults, options);

    // if element already exists not loading of document is needed
    if (self.options.el !== undefined) {
      self.el = self.options.el.length ? self.options.el : $(self.options.el);
      self._initElement();

    // if url is specified this mean we'll want to load html from that url
    } else {
      self.el = function(action) {
        var self = this;

        // before ajax request hook
        if (self.options.onBeforeLoad) {
          self.options.onBeforeLoad.call(self);
        }

        // remove hash part of url and append prefix to url, eg.
        //   convert -> http://example.com/something
        //   into    -> http://example.com/++unthemed++/something
        var url = $.plone.overlay.addPrefixToURL(
              (self.options.url.match(/^([^#]+)/) || [])[1],
              self.options.urlPrefix);

        // do ajax request with prefixed url
        $.get(url, function(response) {

          // from response get content of body
          self.el = $('<div/>').html((/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);

          // after ajax request hook
          if (self.options.onLoad) {
            self.options.onLoad.call(self);
          }

          self._initElement();
        });
      };
    }
  },  

  _initElement: function() {
    var self = this;

    // use modalTemplate to create new modal element
    self.el = self.options.modalTemplate.apply(self, [ self.el ]);

    self.el.modal($.extend(self.options.modal_options, { show: false }));

    // disable all clicks on modal
    self.el.on('click', function(e) {
      var target = $(e.target);

      e.stopPropagation();

      // we prevent all clicks inside overlay except:
      //  - ones who we explicitly mark with allowDefault class
      //  - file and checkbox input elements
      if (target.parents(".allowDefault").length === 0 &&
          target.attr('type') !== 'file' &&
          target.attr('type') !== 'checkbox') {
        e.preventDefault();
      }

      // we use jquery.form.js to submit any form via ajax
      if (self.options.formButtons) {
        var form = $(self.options.form, self.el);
        if ( form.size() !== 0  &&
            $.nodeName(e.target, 'input') &&
            $(e.target).attr('type') === 'submit') {

          var form_options = $.extend({}, self.options.form_options),
              data = {};

          data[$(e.target).attr('name')] = $(e.target).attr('value');
          form.ajaxSubmit($.extend(true, form_options, { data: data }));
        }
      }
    });

    // FIXME
    // check if there is form and instantiate ajaxForm
    var form = $(self.options.form, self.el);
    if (form.size() !== 0) {

      var new_form = $('<form/>');
      $.each(form[0].attributes, function(i, attr) {
        new_form.attr(attr.name, attr.value);
      });

      form.children().first().unwrap();
      self.el.wrapInner(new_form);
    }

    // FIXME
    // $.iframe integration
    if ($.iframe !== undefined) {
      var topFrameHeight = $(self.options.document).height();
      self.el
        .on('show', function() {
          $.iframe.stretch();
          $('.dropdown.open a[data-toggle="dropdown"]').dropdown('toggle');
        })
        .on('shown', function() {
          if (self.el.parents('.modal-wrapper').height() > topFrameHeight) {
            $('body', self.options.document).height(
                self.el.parents('.modal-wrapper').height() +
                self.el.parents('.modal-wrapper').offset().top);
            self.el.parents('.modal-backdrop').height(
                $(self.options.window).height());
          }
        })
        .on('hidden', function() {
          $('body', self.options.document).height(topFrameHeight);
          $.plone.shrink();
        });
    }

    // FIXME: maybe not needed
    // bind events passes with twitter bootstrap's modal events
    $.each(['show', 'shown', 'hide', 'hidden'], function(i, name) {
      self.el.on(name, function() {
        if (self.options[name] !== undefined) {
          self.options[name].call(self);
        }
      });
    });

    // initialize element's javascript widgets
    self.el.appendTo($('body'));
    self.el.ploneInit();

    // scrolling
    $(self.options.document).scroll(function () {
      if (typeof(self.el) === 'object' && self.el.size() === 1) {
        var modal = self.el.parents('.modal-backdrop');
        modal.css({
          'top': -1 * $(self.options.document).scrollTop(),
          'height': $(self.options.document).scrollTop() + modal.height()
        });
        if ($.plone.tinymce !== undefined && $.plone.tinymce.menuStylePosition === undefined) {
            $.plone.tinymce.menuStylePosition = $('.mceMenu').parent().offset().top;
            $('.mceMenu').parent().css('top',
                $.plone.tinymce.menuStylePosition -
                $(self.options.document).scrollTop());
        }
        //modal.modal('show');  // this will make sure backdrop is fully sized
      }
    });

    if (self.options.onInit) {
      self.options.onInit.call(self);
    }
  },

  _action: function(action) {
    var self = this;

    // if el is a function then we call _action back
    // FIXME: is this even used still
    if (typeof(self.el) === 'function') {
      self.el(action);

    // trigger show/hide action of modal
    } else {
      self.el.modal(action);
    }

    return self;
  },

  show: function() {
    var self = this;
    if (self.options.onShow) {
      self.options.onShow.apply(self);
    }
    return self._action('show');
  },

  hide: function() {
    var self = this;
    if (self.options.onHide) {
      self.options.onHide.apply(self);
    }
    return self._action('hide');
  },

  destroy: function() {
    var self = this;
    self.hide();
    if (self.options.onDestroy) {
      self.options.onDestroy.apply(self);
    }
    self.el.remove();
  }

};


// jQuery Integration
$.fn.ploneOverlay = function (options) {
  var el = $(this);

  if (el.size() !== 1) { return; }

  var data = el.data('plone-overlay');

  if (data === undefined) {
    var defaults = { el: el };

    if ($.nodeName(el[0], 'a')) {
      defaults = { url: el.attr('href') };
      if (el.attr('rel')) {
        defaults[el] = el.attr('rel');
      }
    }

    // TODO:  move this into Constructor
    //if ($.nodeName(el[0], 'a')) {
    //  el.on('click', function(e) {
    //    e.preventDefault();
    //    e.stopPropagation();
    //    data.show();
    //  });
    //}

    data = new $.plone.overlay.Constructor($.extend({}, defaults, options));
    el.data('plone-overlay', data);

  } else {
    $.extend(true, data.options, options);
    // TODO: reinitialize
  }

  return data;
};

;
}(jQuery))
