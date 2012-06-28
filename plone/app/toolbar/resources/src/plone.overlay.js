// Plone Overlay
// =============
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//
// Description: 
//    This script is used to provide glue code between iframed and twitter
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
/*global TinyMCEConfig:false, jQuery:false */


(function($) {
"use strict";

// # Namespace
$.plone = $.plone || {};
$.plone.overlay = $.plone.overlay || {};


// # Overlay Class Definition 
$.plone.overlay.Overlay = function(options) { this._init(options); };
$.plone.overlay.Overlay.prototype = {
  _init: function(options) {
    var self = this;

    self.options = $.extend(true, {
      url_rewrite: function(url) {
        // remove hash part of url
        url = (url.match(/^([^#]+)/)||[])[1];
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
      modal_template: function(content, options) {
        var el = $('' +
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
                'input[name="form.actions.cancel"]'
        }, options || {});

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
          if (self.options.cancel !== undefined) {
            self.options.cancel.apply(self, [ e, $(this) ]);
          } else {
            self.destroy();
          }
        });

        return el;
      },
      modal_options: {
        backdrop: true,
        keyboard: true,
        dynamic: true
      },
      form: 'form#form,form[name="edit_form"]',
      form_options: {
        success: function(response, state, xhr, form) {
          var old_el = self._el,
              response_body = $('<div/>').html(
                  (/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);

          if ($('dl.portalMessage.error', response_body).size() !== 0) {
            self._el = response_body;
            if (self.options.el !== undefined) {
              self._el = $(self.options.el, self._el);
            }
            old_el.remove();
            self._init_el();
          } else {
            if (self.options.save !== undefined) {
              self.options.save.apply(self, [ response_body, state, xhr, form ]);
            }
          }
        }
      },
      mask: $.plone.mask || false
    }, options);

    // if no url is specified then no loading is needed
    if (self.options.url === undefined) {
      // in case el option is a string we assume its css selector
      if (typeof(self.options.el) === 'string') {
        self._el = $(self.options.el);
      }
      self._init_el();

    // if url is specified this mean we'll want to load html from that url
    } else {
      self._el = function(action) {
        var self = this;
        if (self.options.load !== undefined) {
          self.options.load.call(self);
        }
        $.get(self.options.url_rewrite(self.options.url), function(response) {
          self._el = $('<div/>').html(
              (/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);
          if (self.options.el !== undefined) {
            self._el = $(self.options.el, self.options.el);
          }
          if (self.options.loaded !== undefined) {
            self.options.loaded.call(self);
          }
          self._init_el();
          self._action(action);
        });
      };
    }
  },
  _init_el: function() {
    var self = this;

    // use modal_template to create new modal element
    // this should give us enough functionality to do with overlay html
    // whatever we want
    self._el = self.options.modal_template(self._el);

    // register _el as twitter bootstrap's modal
    self._el.modal($.extend(self.options.modal_options, { show: false }));

    // disable all clicks on modal
    self._el.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (self.options.form !== false) {
        var form = $(self.options.form, self._el);
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

    // check if there is form and instantiate ajaxForm
    var form = $(self.options.form, self._el);
    if (form.size() !== 0) {

      var new_form = $('<form/>');
      $.each(form[0].attributes, function(i, attr) {
        new_form.attr(attr.name, attr.value);
      });

      form.children().first().unwrap();
      self._el.wrapInner(new_form);
    }

    // $.plone.toolbar integration 
    if ($.plone.toolbar !== undefined) {
      var topFrameHeight = $(window.parent.document).height();
      self._el
        .on('show', function() { $.plone.toolbar.iframe_stretch(); })
        .on('shown', function() {
          if (self._el.parents('.modal-wrapper').height() > topFrameHeight) {
            $('body', window.parent.document).height(
                self._el.parents('.modal-wrapper').height() +
                self._el.parents('.modal-wrapper').offset().top);
            self._el.parents('.modal-backdrop').height(
                $(window.parent).height());
          }
        })
        .on('hidden', function() {
          $('body', window.parent.document).height(topFrameHeight);
          $.plone.toolbar.iframe_shrink();
        });
    }

    // bind events passes with twitter bootstrap's modal events
    $.each(['show', 'shown', 'hide', 'hidden'], function(i, name) {
      self._el.on(name, function() {
        if (self.options[name] !== undefined) {
          self.options[name].call(self);
        }
      });
    });

    // initialize element
    self._el.appendTo($('body'));
    self._el.ploneInit();

    // scrolling
    $(window.parent.document).scroll(function () {
      if (typeof(self._el) === 'object' && self._el.size() === 1) {
        self._el.parents('.modal-backdrop').scrollTop(
            $(window.parent.document).scrollTop());
        self._el.parents('.modal-backdrop').scrollLeft(
            $(window.parent.document).scrollLeft());
      }
    });

    if (self.options.init !== undefined) {
      self.options.init.call(self);
    }
  },
  _action: function(action) {
    var self = this;

    // if _el is a function then we call _action back
    if (typeof(self._el) === 'function') {
      self._el(action);

    // trigger show/hide action of modal
    } else {
      self._el.modal(action);
    }

    return self;
  },
  show: function() {
    return this._action('show');
  },
  hide: function() {
    return this._action('hide');
  },
  destroy: function() {
    var self = this;
    self.hide();
    self._el.remove();
    self._init(self.options);
  }
};


// # jQuery Integration 
$.fn.ploneOverlay = function (options) {
  var el = $(this),
      data = el.data('plone-overlay');

  if (el.size() === 0) { return; }

  if (data === undefined) {
    var defaults = { el: el };
    if ($.nodeName(el[0], 'a')) {
      defaults = { url: el.attr('href') };
      if (el.attr('rel')) {
        defaults[el] = el.attr('rel');
      }
    }

    data = new $.plone.overlay.Overlay($.extend({}, defaults, options));

    if ($.nodeName(el[0], 'a')) {
      el.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        data.show();
      });
    }

    el.data('plone-overlay', data);
  }

  return data;
};

}(jQuery));
