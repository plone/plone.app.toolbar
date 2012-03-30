//
// This script is used to provide glue code between iframize and twitter
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
    // TODO: kick garbas to write some docs
    // TODO: kick him again
    // TODO: write docs
    $.plone.Overlay = function(e, o, c) { this.init(e, o, c); }
    $.plone.Overlay.prototype = {
        init: function(el, options, callback) {
            var self = this;
            self.el = el;
            self.options = $.extend({ show: true }, options, { backdrop: false});

            // overlay
            self._overlay = $('#plone-overlay-template').clone();
            self._overlay.appendTo($('body'));
            self.form = $('form', self._overlay);
            self.title = $('.modal-header > h3', self._overlay);
            self.body = $('.modal-body', self._overlay);
            self.footer = $('.modal-footer', self._overlay);
            self.mask = $.plone.mask;

            // iframe
            self.iframe = window.parent.$('iframe[name=' + window.name + ']').iframize('toolbar');

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
                self.iframe.stretch();
                if (self.mask !== false) {
                    self.mask.load();
                }
            });
            self._overlay.on('hidden', function() {
                self.iframe.shrink();
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
            href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2');

            // TODO: show spinner before starting a request

            $.get(href, function(data) {
                data = $(data).filter('div#visual-portal-wrapper');

                // TODO: hide spinner

                on_load.apply(self, [ data ]);

                self.modal(self.options);

            });
        }
    }
    // }}}

    // # jQuery implementation {{{
    $.fn.ploneOverlay = function (options, callback) {
        var el = $(this),
            overlay = el.data('plone-overlay');

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

        if (overlay === undefined) {
            overlay = new $.plone.Overlay(el, options, callback);
        }
        return overlay
    }
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
            $.each($(document).data('events').plone_overlay, function(i, e) {
                if (e.namespace === id) {
                    event_handler_exists = true;
                    $(el).ploneOverlay();
                    return;
                }
            });
            if (!event_handler_exists) {
                window.parent.location.href = $(el).attr('href');
            }
        });

    });
    // }}}

}(jQuery));

// XXX: not sure if we should separate this out but for convinience i would
// keep definitions of action in the same script

// # Definition of overlays per each button {{{
(function($) {
    "use strict";

    // # Common utils {{{

    // ## Forms helper {{{
    $.plone.overlay_form_transform = function(overlay, data, options) {

        options = $.extend({
            title_selector: 'h1.documentFirstHeading',
            form_selector: '#content form',
            buttons_selector: '.formControls > input[type=submit]',
            cancel_buttons: [
                "input[name='buttons.cancel']",
                "input[name='form.button.Cancel']",
                "input[name='form.button.cancel']",
                "input[name='form.actions.cancel']"
                ]
        }, options || {});

        // copy content from data into overlay
        overlay.title.html($(options.title_selector, data).html());
        overlay.body.html($(options.form_selector, data).html());

        // set form attributes to form attributes in overlay
        overlay.form.addClass('form-horizontal');
        $.each($(options.form_selector, data)[0].attributes, function(i, attr) {
            overlay.form.attr(attr.name, attr.value);
        });

        // trigger tinymce
        $('textarea.mce_editable', overlay.body).each(function() {
            var id = $(this).attr('id'),
                config = new TinyMCEConfig(id);
            // Forgive me for I am about to sin. But it does mean
            // we can overlay it multiple times. If you know a
            // better way, please share.
            // garbas: its javascript its ok to sin.
            delete InitializedTinyMCEInstances[id];
            config.init();
        });

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
                        .appendTo(overlay.footer))
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
    $(document).on('plone_overlay.plone-action-folderContents', function(e) {
        var self = this;

        $('#folderlisting-main-table a', self.body).each(function(){

            // Remove any parameters from the url
            var href = $(this).attr('href');
            var base_href = (href.match(/^([^?]+)/)||[])[1];

            if(base_href.match(/\/folder_contents$/)){
                var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                    .attr('href', $(this).attr('href').replace(/\/folder_contents$/, ''))
                    .attr('class', 'viewlink')
                    .attr('target', '_parent')
                    .attr('title', 'Open here'); // Needs i18n!
                $(this).parent().append(viewlink);
            } else if (base_href.match(/\/folder_position$/)){
                // Do nothing, the default click handler already keeps
                // the result in the overlay
            } else if (base_href.match(/\/folder_contents$/)) {
                // It has parameters, leave it alone
            } else {
                // Replace click handler
                $(this).off('click');
                $(this).on('click', function(e){
                   window.parent.location.href = $(e.target).attr('href');
                });
            }
        });

        // Add an "Open here" link at the top
        var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
            .attr('href', e.href.replace(/\/folder_contents$/, ''))
            .attr('class', 'viewlink')
            .attr('target', '_parent')
            .attr('title', 'Open here'); // Needs i18n!
        $('h1.documentFirstHeading').append(viewlink);

        // Keep forms inside the overlay by placing result of form submission
        // back into the overlay and calling overlay_setup again.
        $('form').ajaxForm({
            success: function (responseText){
                var modal = $('#toolbar-overlay'),
                    body = $('.modal-body', modal),
                    selector = '#portal-column-content > *';
                // strip inline script tags
                responseText = responseText.replace(/<script(.|\s)*?\/script>/gi, "");
                var res = $('<div />').append(responseText)
                    .find(selector);
                body.empty().append(res);
                overlay_setup(modal, body, 'toolbar-button-folderContents', e.href, selector);
                return false;
            }
        });

        // Fix breadcrumbs to go to folder_contents
        $('#toolbar-overlay #portal-breadcrumbs a').each(function(){
            $this = $(this);
            $this.attr('href', $this.attr('href') + '/folder_contents');
        });

    });
    // }}}

    // TODO: bellow i listed action which i think we should implement, i might,
    // and i probably did, also forgot some.

    // ## Edit {{{
    $(document).on('plone_overlay.plone-action-edit', function(e, overlay) {
        overlay.load(function(data) {
            $.plone.overlay_form_transform(overlay, data);

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

    // ## Rules
    // ## Sharing

    // ## Actions -> Cut
    // ## Actions -> Paste
    // ## Actions -> Delete
    // ## Actions -> Rename

    // ## Display -> Select a content item as default view

    // ## Add forms {{{
    // FIXME: not working
    $(document).on('plone_overlay.toolbar-button-plone-contentmenu-factories', function(e){
        // Submit form using ajax, then close modal and reload parent
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);
        $('form', body).ajaxForm({
            success: function() {
                modal.modal('hide');
                body.empty();
                window.parent.location.replace(window.parent.location.href);
            }
        });
     });
    // }}}

    // ## State: ??? -> Publish, Submit for publication, Retract, Send back
    // ## State: ??? -> Advanced...

    // ## Personal -> Preferences
    // ## Personal -> Site Setup

}(jQuery));
// }}}
