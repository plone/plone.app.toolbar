// This plugin is used to put selected into iframe. {{{
//
// @author Rok Garbas
// @version 1.0
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
/*global $:false, jQuery:false, alert:false */

// }}}

(function ($) {
    "use strict";

    // # Namespace {{{
    $.iframize = $.iframize || {};
    // }}}

    // # Defaults {{{
    $.iframize.defaults = $.extend(true, {
        resources_data_attr: 'data-iframe-resources',
        resources_delimiter: ';',
        iframe_attrs: {
            id: 'plone-toolbar',
            name: 'plone-toolbar',
            allowtransparency: 'true',
            style: 'margin: 0; padding: 0; border: 0; outline: 0; ' +
                   'width: 100%; height: 40px; z-index: 500; ' +
                   'position: fixed; left: 0; top: 0; ' +
                   'background-color: transparent; overflow: hidden;'
        }
    }, $.iframize.defaults || {});
    // }}}

    // # Resource {{{
    $.iframize.Resource = function(r, a) { this.init(r, a); return this; };
    $.iframize.Resource.prototype = {
        init: function(res, attrs) {
            var self = this,
                tmp = $(res.split('!'));
            self._is = {};
            self.attrs = attrs;
            if (tmp.size() === 2) {
                res = tmp[1];
                self._is[tmp[0]] = true;
            }
            self.res = res;
        },
        is: function(type) {
            var self = this,
                res = self.res;
            if (self._is[type] === undefined) {
                if ((res.substr((type.length + 1) * -1) === '.' + type) ||
                    (res.substr((type.length + 1)) === type + '!')) {
                    self._is[type] = true;
                } else {
                    self._is[type] = false;
                }
            }
            return self._is[type];
        },
        render: function() {
            var self = this,
                attr_name = 'src',
                attrs = $.extend({}, self.attrs);
            if (self.is('css') || self.is('less')) {
                attr_name = 'href';
            }
            attrs[attr_name] = self.res;
            if (self.is('css')) {
                return $('<link/>').attr($.extend({
                    type: 'text/css',
                    rel: 'stylesheet',
                    media: 'screen',
                    href: ''
                }, attrs));
            } else if (self.is('less')) {
                return $('<link/>').attr($.extend({
                    type: 'text/css',
                    rel: 'stylesheet/less',
                    media: 'screen',
                    href: ''
                }, attrs));
            } else if (self.is('js')) {
                return $('<script/>').attr($.extend({
                    type: 'text/javascript',
                    src: ''
                }, attrs));
            }
            return $('');
        },
        render_as_string: function() {
            return this.outerHtml(this.render());
        },
        outerHtml: function(el) {
            el = el[0];
            if ($.nodeName(el, 'script')) {
                var attrs;
                if (el.attributes) {
                    attrs = $.map(el.attributes, function(attr) {
                        return attr.name + '="' + attr.value + '"';
                    });
                }
                return '<script ' + attrs.join(' ') + '>' +
                    $(el).html() + '</script>';
            } else {
                return $('<div>').append(el).remove().html();
            }
        }
    };
    // }}}

    // # IFrame {{{
    $.iframize.IFrame = function(e, r, a) { this.init(e, r, a); return this; };
    $.iframize.IFrame.prototype = {
        init: function(el, resources, iframe_attrs) {
            var self = this;

            // hide and clone original element
            self.el_original = el;
            self.el_original.hide();
            self.el = self.el_original.clone();
            self.el.show();

            // create iframe
            iframe_attrs = $.extend(true,
                    $.iframize.defaults.iframe_attrs, iframe_attrs || {})
            self.el_iframe = $('<iframe/>').attr(iframe_attrs);

            // if nothing was changed from default iframe attr then we can
            // lower body for 40px as its iframe's height
            if (iframe_attrs.style === $.iframize.defaults.iframe_attrs.style) {
                $('body').prepend(self.el_iframe).css('margin-top', '40px');

            // place iframe before original element
            } else {
                self.el_iframe.insertBefore(self.el_original);
            }

            // resources
            self.resources = '';
            $.each(resources, function(i, resource) {
                self.resources += new $.iframize.Resource(resource)
                        .render_as_string();
            });

            // append css and javascript resources
            self.window = self.el_iframe[0].contentWindow;
            self.document = self.el_iframe.contents()[0];
            self.document.open();
            self.document.write(self.resources);
            self.document.close();

            self.el_iframe.load(function() {

                // copy clone of original into iframe
                $('body', self.document).append(self.el)
                    .css({ background: 'transparent', height: '100%' });

                // capture all clicks on iframe
                $('body', self.document).bind('click', { self: self }, function(e) {
                    var self = e.data.self,
                        el = $(e.target);

                    // shrink iframe
                    self.shrink();

                    if (($.nodeName(e.target, 'a') ||
                            $.nodeName(el.parent()[0], 'a')) &&
                        (e.which === 1 || e.which === 2)) {

                        if (!$.nodeName(e.target, 'a')) {
                            el = el.parent();
                        }

                        // Buttons default to an overlay but if they
                        // have the '_parent' link target, just load them in
                        // the top window
                        if (el.attr('target') === '_parent') {
                            if (e.which === 1) {
                                window.parent.location.href = el.attr('href');
                            } else {
                                window.parent.open(el.attr('href'));
                            }
                        } else {
                            // FIXME: this is too bootstrap specific
                            if (el.parent().hasClass('open')) {
                                self.strech();
                            }
                            self.window.$(self.document).trigger('iframize_link_clicked', [el, self]);
                            e.preventDefault();
                        }
                    }

                });

                $(self.el).trigger('iframize_loaded');

            });
        },
        shrink: function() {
            var self = this;
            if (self.position !== undefined) {
                // set to before strech position
                self.el_iframe.height(self.position.height);
                self.el_iframe.offset(self.position.offset);
                // clear position
                self.position = undefined;
            }
        },
        strech: function() {
            var self = this;
            // record position / offset
            self.position = {};
            self.position.height = self.el_iframe.height();
            self.position.offset = self.el_iframe.offset();
            // stretch over whole document
            self.el_iframe.height($(document).height());
            self.el_iframe.offset($(document).offset());
        }
    };
    // }}}

    // # jQuery integration {{{
    $.fn.iframize = function(resources) {
        var self = this;
        if (self.data('iframize') === undefined) {
            var iframe = new $.iframize.IFrame(self, resources);
            self.data('iframize', iframe);
        }
        return self.data('iframize');
    };
    // }}}

    // # Auto trigger iframe plugin {{{
    //
    // elements with data-iframe="true"
    $(document).ready(function() {
        $("[data-iframe='true']").each(function() {
            $(this).iframize(
                $(this).attr($.iframize.defaults.resources_data_attr)
                       .split($.iframize.defaults.resources_delimiter));
        });
    });
    // }}}

}(jQuery));

