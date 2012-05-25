//
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
/*global $:false, jQuery:false */


(function($) {
    "use strict";

    // # Namespace {{{
    $.plone = $.plone || {};
    // }}}

    // # Overlay {{{
    //
    $.plone.Overlay = function(e, o, c) { this.init(e, o, c); };
    $.plone.Overlay.prototype = {
        init: function(el, options, callback) {
            var self = this;
            self.el = el;
            self.options = $.extend({ show: true }, options, { backdrop: false});
            self.mask = false; //$.plone.mask;

            // overlay
            self._overlay = $('#plone-overlay-template').clone();
            self._overlay.removeAttr('id').appendTo($('body'));

            self.form = $('form', self._overlay);
            self.title = $('.modal-header > h3', self._overlay);
            self.body = $('.modal-body', self._overlay);
            self.footer = $('.modal-footer', self._overlay);

            // keep all links inside the overlay
            $('a', self.body).on('click', function(e){
                e.preventDefault();
                e.stopPropagation();

                // TODO: should done with slide left effect
                // TODO: we need to connect this with browser history

                // for now we hide current overlay and open new overlay
                self.modal('hide');
                $(this).ploneOverlay();
            });

            self._overlay.on('click', function(e) { e.stopPropagation(); });
            self._overlay.on('shown', function() {
                $.iframe.stretch();
                if (self.mask !== false) {
                    self.mask.load();
                }
            });
            self._overlay.on('hidden', function() {
                $.iframe.shrink();
                if (self.mask !== false) {
                    self.mask.close();
                }
            });
            $('[data-dismiss=modal]', self._overlay).on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.modal('hide');
            });

            if (callback === undefined) {
                $(document).trigger('plone_overlay.' + self.el.parent().attr('id'), self);
            } else {
                callback(self);
            }
        },
        modal: function(options) {
            this._overlay.modal(options);
        },
        load: function(on_load) {
            // Clean up the url
            // Insert ++untheme++ namespace to disable theming. This only works
            // for absolute urls.
            var self = this,
                href = self.el.attr('href');
            href = (href.match(/^([^#]+)/)||[])[1];
            href = href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2');

            // TODO: show spinner before starting a request

            $.get(href, function(data) {
                data = $(data).filter('div#visual-portal-wrapper');

                // TODO: hide spinner

                on_load.apply(self, [ data ]);

                self.modal(self.options);

            });
        }
    };
    // }}}

    // # jQuery implementation {{{
    $.fn.ploneOverlay = function (options, callback) {
        var el = $(this),
            data = el.data('plone-overlay');

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (data === undefined) {
            data = new $.plone.Overlay(el, options, callback);
            el.data('plone-overlay', data);
        }

        return data;
    };
    // }}}

    // # Trigger overlay {{{
    $(document).ready(function() {

        // TODO: we should add this template in toolbar tile at the bottom
        $('body').append($(''+
            '<div class="modal" id="plone-overlay-template" style="display: none;">' +
            '  <form>' +
            '  <div class="modal-header">' +
            '    <a class="close" data-dismiss="modal">&times;</a>' +
            '    <h3>Title</h3>' +
            '  </div>' +
            '  <div class="modal-body">Content</div>' +
            '  <div class="modal-footer">Buttons</div>' +
            '  </form>' +
            '</div>').hide());

        var _window = window;
        if (window.parent !== window) {
            _window = window.parent;
        }
        _window.$(_window.document).on('iframe_link_clicked', function(e, el) {
            var id = $(el).parent().attr('id'),
                event_handler_exists = false;
            if ($(document).data('events') !== undefined) {
              $.each($(document).data('events').plone_overlay, function(i, e) {
                if (e.namespace === id) {
                  event_handler_exists = true;
                  $(el).ploneOverlay();
                  return;
                }
              });
            }
            if (!event_handler_exists) {
                window.parent.location.href = $(el).attr('href');
            }
        });

    });
    // }}}

}(jQuery));
