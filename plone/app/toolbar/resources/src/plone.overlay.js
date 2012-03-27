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
    $.plone.Overlay = function(el) { this.init(el); return this; }
    $.plone.Overlay.prototype = {
        init: function(el) {
            var self = this;
            self.el = el;

            // FIXME:
            // clone template, place it after self.el
            // store it to self._overlay
            // create also links to title, body, footer

            // convinient 
            self.title = $('.modal-header > h3', self._overlay);
            self.body = $('.modal-body', self._overlay);
            self.body = $('.modal-footer', self._overlay);

            // by default we dont want to propagete event out of overlay
            self._overlay.on('click', function(e) { e.stopPropagation(); });

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

            // FIXME: self.iframe ???
            self.el.on('show', function() { self.iframe.stretch(); });
            self.el.on('hide', function() { self.iframe.shrink(); });

            // fifure out how to get id
            // trigger custom event
            $(document).trigger('plone_overlay' + id, self);
        },
        modal: function(options) {
            self.el.modal(options);
        },
        load: function(on_load) {
            // Clean up the url
            // Insert ++untheme++ namespace to disable theming. This only works
            // for absolute urls.
            var href = self.el.attr('href');
            href = (href.match(/^([^#]+)/)||[])[1];
            href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2');

            // TODO: show spinner before starting a request

            $.get(href, function(data) {
                data = $('<div/>').html(data);

                // TODO: hide spinner

                if (on_load === undefined) {
                    on_load.apply(this, [data]);
                }

            });
        }
    }
    // }}}

    // # jQuery implementation {{{
    $.fn.ploneOverlay = function (options) {
        var el = $(this),
            overlay = el.data('plone-overlay');

        if (overlay === undefined) {
            overlay = new $.plone.Overlay(el);
        }

        if (options !== undefined) {
            overlay.modal(options);
        }

        return overlay
    }
    // }}}

    // # Trigger overlay {{{
    $(document).ready(function() {

        // TODO: we should add this template in toolbar tile at the bottom
        $('body').append($(''+
            '<div class="modal" id="plone-overlay">' +
            '  <div class="modal-header">' +
            '    <a class="close" data-dismiss="modal">×</a>' +
            '    <h3>Title</h3>' +
            '  </div>' +
            '  <div class="modal-body">Content</div>' +
            '  <div class="modal-footer">' +
            '    <a href="#" class="btn">Cancel</a>' +
            '    <a href="#" class="btn btn-primary">Save changes</a>' +
            '  </div>' +
            '</div>').hide());

        var _window = window;
        if (window.parent !== window) {
            _window = window.parent;
        }
        _window.$(_window.document).bind('iframe_link_clicked', function(e, el) {
            $(el).ploneOverlay({ show: true }, iframe);
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

    // ## Tinymce {{{
    function tinymce(overlay) {
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
    }
    // }}}

    // ## Tabs (ala twitter bootstrap) {{{
    function tabs(overlay) {
    }
    // }}}

    // ## Form title {{{
    // }}}

    // ## Form {{{
    // }}}

    // ## Form buttons (ala twitter bootstrap) {{{
    function buttons(overlay) {
    }
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

    // ## Edit
    // # Trigger deco {{{
    //var iframe = window.parent.$('#' + $.plone.globals.toolbar_iframe_id).iframize('deco-toolbar');
    //window.parent.$(iframe.el_iframe).bind('iframe_loaded', function() {
    //    $('#plone-action-edit > a').bind('click', function(e) {
    //        if ($('[data-iframe="deco-toolbar"]', window.parent.document).size() > 0) {
    //            e.preventDefault();
    //            e.stopPropagation();
    //            $(this).ploneDecoToolbar();
    //        }
    //    });
    //});
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
