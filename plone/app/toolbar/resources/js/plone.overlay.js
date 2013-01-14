// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
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


(function ($, Patterns, iframe, mask, undefined) {
"use strict";

// Constructor
var PloneOverlay = Patterns.Base.extend({
  name: 'plone-overlay',
  jqueryPlugin: 'ploneOverlay',
  defaults: {
    mask: mask,

    // hooks
    onInit: undefined,
    onBeforeLoad: undefined,
    onLoaded: undefined,
    onShow: undefined,
    onHide: undefined,
    onDestroy: undefined,

    // buttons which should
    formButtons: {},

    // adding prefix to url (after domain part)
    changeAjaxURL: function(url, prefix) {
      prefix = prefix || '++unthemed++';

      // TODO: we should add it after plone site url (head>base)
      if (url.indexOf('http') === 0) {
        return url.replace(/^(https?:\/\/[^\/]+)\/(.*)/, '$1/' + prefix + '/$2');
      } else if (url.indexOf('/') === 0) {
        return window.location.protocol + '//' +
                window.location.host + '/' + prefix + url;
      } else {
        return window.location.protocol + '//' +
                window.location.host + '/' + prefix +
                window.location.pathname + '/' + url;
      }
    },

    modalTemplate: function(options) {
      options = $.extend({
        title: 'h1.documentFirstHeading',
        body: '#content',
        destroy: '[data-dismiss="modal"]'
      } , options || {});

      return function($content) {
        var overlay = this,
            $modal = $('' +
              '<div class="modal fade"' +
              '     data-pattern="plone-tabs"' +
              '     data-plone-tabs-tabs-klass="nav nav-tabs"' +
              '     data-plone-tabs-tab-klass=""' +
              '     data-plone-tabs-panel-klass="">' +
              '  <div class="modal-header">' +
              '    <a class="close" data-dismiss="modal">&times;</a>' +
              '    <h3></h3>' +
              '  </div>' +
              '  <div class="modal-body"></div>' +
              '  <div class="modal-footer"></div>' +
              '</div>'),
            $title = $('.modal-header > h3', $modal),
            $body = $('.modal-body', $modal),
            $footer = $('.modal-footer', $modal);


        // Title
        $title.html($(options.title, $content).html());

        // Content
        $body.html($(options.body, $content).html());
        $(options.title, $body).remove();
        $(options.footer, $body).remove();

        // destroying modal
        $(options.destroy, $modal).off('click').on('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          overlay.destroy();
        });

        return $modal;
      };
    },

    ajaxSubmit: function(defaults) {
      return function(button, options) {
        var overlay = this;

        // make this method extendable
        options = $.extend({
          errorMsg: '.portalMessage.error',
          buttonContainer: '.modal-footer',
          responseFilter: '#content',
          replaceFilter: '#portal-column-content',
          // hooks
          onError: undefined,
          onSave: undefined
        }, defaults || {} , options || {});

        // hide and copy same button to .modal-footer, clicking on button in
        // footer should actually click on button inside form
        button.clone()
          .appendTo($(options.buttonContainer, overlay.$modal))
          .on('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            button.trigger('click');
          });
        button.hide();

        // we return array of options which will be passed to ajaxSubmit
        // TODO: add loading spinner
        // TODO: hook in notification stuff
        return {
          dataType: 'html',
          success: function(response, state, xhr, form) {
            var _document = document,
                responseBody = $('<div/>').html(
                    (/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);

            // use iframe's document if avaliable
            if (iframe) {
              _document = iframe.document;
            }

            // if error is found res
            if ($(options.errorMsg, responseBody).size() !== 0) {
              // TODO: this should be done more smooth
              overlay.$modal.remove();
              overlay.$modal = $(options.responseFilter, responseBody);
              overlay.initModal();

              if (options.onError) {
                options.onError.apply(overlay, [ responseBody, state, xhr, form, button ]);
              }

              overlay.show();

            // custom save function
            } else if (options.onSave) {
              options.onSave.apply(overlay, [ responseBody, state, xhr, form, button ]);

            // common save function, we replace what we filtered from response
            } else if ($(options.responseFilter, _document).size() !== 0) {
              $(options.replaceFilter, _document)
                .html($(options.replaceFilter, responseBody).html());
              overlay.destroy();

            } else {
              overlay.destroy();
            }
          }
        };
      };
    }
  },
  init: function() {
    var self = this;

    // we don't have to initialize modal if already initialized
    if ( self.$modal ) { return self; }

    // no element passed, usually this mean that triggeting will be done
    // manually
    if (!self.$el.jquery) {
      self.options = self.$el;
      self.$el = undefined;
    }

    // merge options with defaults
    self.options = $.extend({}, self.defaults, self.options);

    if (self.$el && $.nodeName(self.$el[0], 'a')) {
      // element "a" can also give us info where to load modal content from
      if (!self.options.ajaxUrl) {
        self.options.ajaxUrl = self.$el.attr('href');
      }
      // element "a" will also trigger showing of modal when clicked
      self.$el.on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        self.show();
      });
    }

    // custom function which will get resolved on first call
    if (typeof self.options.ajaxUrl === 'function') {
      self.$modal = self.options.ajaxUrl;

    // else ajaxUrl is string as its suppose to be
    } else {
      self.$modal = function(callback) {
        var self = this;

        // before ajax request hook
        if (self.options.onBeforeLoad) {
          self.options.onBeforeLoad.call(self);
        }

        // remove hash part of url and append prefix to url, eg.
        //   convert -> http://example.com/something
        //   into    -> http://example.com/++unthemed++/something
        var ajaxURL = self.options.changeAjaxURL((self.options.ajaxUrl.match(/^([^#]+)/) || [])[1]);

        // do ajax request with prefixed url
        $.get(ajaxURL, {}, function(response) {

          // from response get content of body
          self.$modal = $('<div/>').html((/<body[^>]*>((.|[\n\r])*)<\/body>/im).exec(response)[1]);

          // after ajax request hook
          if (self.options.onLoaded) {
            self.options.onLoaded.call(self);
          }

          self.initModal();

          if (callback) {
            callback.call(self);
          }
        }, 'html');
      };
    }
  },
  initModal: function() {
    var self = this;

    // use modalTemplate to create new modal element
    self.$modal = self.options.modalTemplate().apply(self, [self.$modal]).hide();

    // append element to body
    if (self.$modal.parents('body').size() === 0) {
      self.$modal.appendTo('body');
    }

    // initialize modal but dont show it
    self.$modal.modal({
      backdrop: 'static',
      dynamic: true,
      keyboard: false,
      show: false
    });

    // disable all clicks on modal
    self.$modal.on('click', function(e) {
      var target = $(e.target);

      e.stopPropagation();

      // we prevent all clicks inside overlay except:
      //  - ones who we explicitly mark with allowDefault class
      //  - file and checkbox input elements
      if (!target.hasClass("allowDefault") &&
          target.attr('type') !== 'file' &&
          target.attr('type') !== 'radio' &&
          target.attr('type') !== 'checkbox') {

        e.preventDefault();

        if (self._formButtons) {
          // check if any form button was clicked
          var clickedButton;
          $.each(self._formButtons, function(formButton) {
            var el = $(formButton, self.$modal);
            if (el.size() !== 0 && el[0] === e.target) {
              clickedButton = formButton;
            }
          });
          if (clickedButton) {
            var form = $(clickedButton, self.$modal).parents('form');
            if (form.size() !== 0) {
              var data = {};
              data[$(e.target).attr('name')] = $(e.target).attr('value');
              form.ajaxSubmit($.extend(true,
                    self._formButtons[clickedButton], { data: data } ));
            }
          }
        }

      }
    });

    // jquery.form integration: at this point we calculate form options which
    // are passed when button will be clicked
    if (self.options.formButtons) {
      self._formButtons = {};
      $.each(self.options.formButtons, function(formButton) {
        var button = $(formButton, self.$modal);
        if (button.size() !== 0) {
          if (typeof self.options.formButtons[formButton] === 'function') {
            self._formButtons[formButton] = self.options.formButtons[formButton]
              .apply(self, [ button ]);
          } else {
            self._formButtons[formButton] = self.options.ajaxSubmit().apply(self, [ button ]);
          }
        }
      });
    }

    // $.iframe integration:
    //  - calls stretch/shrink when showing/hidding of modal
    //  - sync scrolling of top frame and current frame
    if (iframe !== undefined) {

      var topFrameHeight = $(iframe.document).height();
      self.$modal
        .on('show', function() {
          iframe.stretch();
        })
        .on('shown', function() {
          if (self.$modal.parents('.modal-wrapper').height() > topFrameHeight) {
            $('body', iframe.document).height(
                self.$modal.parents('.modal-wrapper').height() +
                self.$modal.parents('.modal-wrapper').offset().top);
            self.$modal.parents('.modal-backdrop').height($(iframe.window).height());
          }
        })
        .on('hidden', function() {
          $('body', iframe.document).height(topFrameHeight);
          iframe.shrink();
        });

      // sync scrolling
      $(iframe.document).scroll(function () {
        var backdrop = self.$modal.parents('.modal-backdrop');
        if (iframe && iframe.document) {
          backdrop.css({
            'top': -1 * $(iframe.document).scrollTop(),
            'height': $(iframe.document).scrollTop() + backdrop.height()
          });
        }
      });
    }
    // patterns integration
    if (Patterns) {
      Patterns.initialize(self.$modal);
    }
    // initialize hook
    if (self.options.onInit) {
      self.options.onInit.call(self);
    }
  },
  show: function() {
    var self = this;

    // if self.$modal is function then call it and pass this function as parameter
    // which needs to be called once loading of modal's html has been done
    if (typeof(self.$modal) === 'function') {
      self.$modal.apply(self, [ self.show ]);

    } else {

      // showing bootstrap's modal
      self.$modal.modal('show');

      // show hook
      if (self.options.onShow) {
        self.options.onShow.call(self);
      }
    }
  },
  hide: function() {
    var self = this;

    // hiding of modal is not possible if its not even loaded
    if (typeof(self.$modal) === 'function') {
      return;
    }

    // calling hide on bootstrap's modal
    self.$modal.modal('hide');

    // hide hook
    if (self.options.onHide) {
      self.options.onHide.call(self);
    }

  },
  destroy: function() {
    var self = this;

    // destroying of modal is not possible if its not even created
    if (typeof(self.$modal) === 'function') {
      return;
    }

    // first we hide modal, so all nice animations happen.
    self.hide();

    // remove modal's DOM element
    self.$modal.remove();

    //  reinitialize
    //if (self.$el) {
    //  self.$el.data('plone-overlay', new PloneOverlay(self.$el, self.options));
    //}

    // destroy hook
    if (self.options.onDestroy) {
      self.options.onDestroy.call(self);
    }
  },
  getBaseURL: function(text){
    return $((/<base[^>]*>((.|[\n\r])*)<\/base>/im).exec(text)[0]).attr('href');
  }
});


Patterns.register(PloneOverlay);


}(window.jQuery, window.Patterns, window.jQuery.iframe, window.jQuery.mask));
