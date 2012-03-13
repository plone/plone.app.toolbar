// This plugin is used to create and edit deco layout. {{{
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
    $.toolbar = $.toolbar || {};
    // }}}

    // # outerHtml {{{
    $.toolbar._outerHtml = function(el) {
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
    };
    // }}}

    // # overlay {{{
    function overlay(e) {
        var el = $(e.target),
            toolbar = e.data.self,
            href = el.closest('a').attr('href'),
            modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);

        if(href === undefined){
            return;
        }

        // Clean up the url, set toolbar skin
        href = (href.match(/^([^#]+)/)||[])[1];

        body.empty().load(href + ' #portal-column-content',
            function(response, error){
                var ev = $.Event();
                ev.type='beforeSetupOverlay',
                    ev.target = e.target,
                    e.modal = modal[0];
                $(document).trigger(ev);

                // If beforeSetupOverlay says so, stop here.
                if(!ev.isDefaultPrevented()){
                    // Keep all links inside the overlay
                    $('a', body).on('click', overlay);

                    // Init plone forms if they exist
                    if ($.fn.ploneTabInit) {
                        body.ploneTabInit();
                    }

                    // Tinymce editable areas inside overlay
                    //$('textarea.mce_editable', body).each(function() {
                    //    var id = $(this).attr('id'),
                    //        config = new TinyMCEConfig(id);
                    //    // Forgive me for I am about to sin. But it does mean
                    //    // we can overlay it multiple times. If you know a
                    //    // better way, please share.
                    //    delete InitializedTinyMCEInstances[id];
                    //    config.init();
                    //});

                    // Call any other event handlers
                    ev = $.Event();
                    ev.type='afterSetupOverlay',
                        ev.target = e.target,
                        ev.modal = modal[0];
                    $(document).trigger(ev);
                }

                // Shrink iframe when the overlay is closed
                modal.on('hidden', function(e){ toolbar.shrink(); });

                // Show overlay
                toolbar.stretch();
                modal.modal('show');
            }
        );
        e.preventDefault();
    }
    // }}}

    // # Micro Templating {{{
    $.toolbar._template = function(tmpl, data) {
        tmpl = $(tmpl);
        $.each(data, function(key, el) {
            if (typeof(el) === 'string') {
                el = $(el);
            }
            el.each(function(i, item) {
                $(key, tmpl).append(item);
            });
        });
        return tmpl;
    };
    // }}}

    // # Options {{{
    $.toolbar.defaults = $.extend(true, {
        resources: [],

        iframe_id: 'toolbar',
        iframe_name: 'toolbar',
        iframe_allowtransparency: 'true',
        iframe_streched_klass: 'toolbar-streched',

        groups_labels: {},
        groups_klass: 'toolbar-groups',
        group_open_klass: 'toolbar-group-open',
        group_klass: 'toolbar-group',
        group_klass_prefix: 'toolbar-group-',

        button_klass: 'toolbar-button',
        button_options: {
            title: '',
            url: '#',
            id: '',
            klass: '',
            group: 'default'
            },

        template: '<div class="toolbar-wrapper">' +
            '<div class="toolbar"></div></div>',
        template_options: function(groups) {
            return { '.toolbar': groups.render() };
            }
    }, $.toolbar.defaults);
    // }}}

    // # Render resources {{{
    //
    // Example:
    //
    //      new Resource('main'js').render_as_string();
    //
    // Which will output...
    //
    //      <script type="text/javascript" src="main.js"></script>
    //
    $.toolbar.Resource = function(r, a) { this.init(r, a); return this; };
    $.toolbar.Resource.prototype = {
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
            if (self.is('css')) {
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
            } else if (self.is('js')) {
                return $('<script/>').attr($.extend({
                    type: 'text/javascript',
                    src: ''
                }, attrs));
            }
            return $('');
        },
        render_as_string: function() {
            return $.toolbar._outerHtml(this.render());
        }
    };
    // }}}

    // # Models definitions {{{
    $.toolbar.Button = function(o, t) { this.init(o, t); return this; };
    $.toolbar.Groups = function(o, t) { this.init(o, t); return this; };
    $.toolbar.Toolbar = function(e, b, o) { this.init(e, b, o); return this; };
    // }}}

    // # Button {{{
    $.toolbar.Button.prototype = {
        init: function(options, toolbar_options) {
            var self = this;

            self.toolbar_options = $.extend({},
                    $.toolbar.defaults, toolbar_options || {});
            self.options = $.extend({},
                    self.toolbar_options.button_options, options || {});
            self.el = $('<li/>');
            self.el_button = $('<a/>');
            self.el_groups = self.render_groups(self.options.buttons);
            self.rendered = false;

            // group button should open/close group of buttons
            self.el_button.bind('click', { self: self }, function (e) {
                if (e.which === 1) {
                    var self = e.data.self, el = self.el,
                        groups_klass = self.toolbar_options.groups_klass,
                        group_open_klass = self.toolbar_options.group_open_klass,
                        iframe_id = self.toolbar_options.iframe_id,
                        toolbar = $('iframe#' + iframe_id).toolbar(),
                        toolbar_document = toolbar.el.contents();

                    if ($('> div.' + groups_klass, el).size() === 0) {
                        return;
                    }

                    // we make sure all submenus are hidden and deactivated
                    $('.' + groups_klass, toolbar_document).hide();
                    $('.' + group_open_klass, toolbar_document)
                            .removeClass(group_open_klass);

                    // closing submenu
                    if (el.hasClass(group_open_klass)) {

                        // removing marker class which was marking button as
                        // activated / open
                        el.removeClass(group_open_klass);

                        // hiding group
                        $('> div.' + groups_klass, el).hide();

                        // shrinking iframe to its initial height
                        toolbar.shrink();

                    // opening submenu
                    } else {

                        // we provide helper class object so themes can style when
                        // dropdown of submenu is activated / open
                        el.addClass(group_open_klass);

                        // we show submenu, was initialy hidden
                        $('> div.' + groups_klass, el).show();

                        // we stretch iframe over whole top frame which should
                        // be marked as transparent so user wont see it
                        toolbar.stretch();

                    }
                }
                return false;
            });
        },
        render_groups: function(buttons) {
            if (buttons === undefined || $(buttons).size() === 0) {
                return;
            }

            var self = this,
                el = $('<div/>')
                    .addClass(self.toolbar_options.groups_klass)
                    .hide(),
                groups_labels = self.toolbar_options.groups_labels,
                groups = new $.toolbar.Groups(buttons, self.toolbar_options);

            $.each(groups.buttons, function (group_name) {
                // default group should always be first and without title
                if (group_name === 'default') {
                    el.prepend(groups.render_group(group_name));
                } else {
                    var group_title = groups_labels[group_name];
                    if (group_title !== undefined) {
                        el.append($('<h3/>').append(group_title));
                    }
                    el.append(groups.render_group(group_name));
                }
            });

            return el;
        },
        render: function(options) {
            var self = this,
                button_options = options ? $.extend({},
                    self.toolbar_options.button_options, options || {}) :
                    self.options;

            // a bit of optimization
            if (options === undefined && self.rendered === true) {
                return self.el;
            }

            self.el.attr({
                'id': button_options.id,
                'class': self.toolbar_options.button_klass
                }).html('');

            self.el_button
                .attr({
                    'href': button_options.url,
                    'class': button_options.klass
                    })
                .html(button_options.title)
                .appendTo(self.el);

            // if icon was defined we create img element and insert it into
            // button element
            if (button_options.icon) {
                self.el_button.prepend(
                    $('<img/>').attr({src: button_options.icon})
                );
            }

            var el_groups = self.el_groups;
            if (options !== undefined) {
                el_groups = self.render_groups(button_options.buttons);
            }

            if (el_groups) {
                self.el_button.after(el_groups);
            }

            // if some custom code is needed we use ``exec`` option
            if (button_options.exec !== undefined) {
                button_options.exec.call(self.el, self, button_options);
            }

            // mark as rendered 
            self.rendered = false;

            return self.el;
        }
    };
    // }}}

    // # Groups {{{
    $.toolbar.Groups.prototype = {
        init: function(buttons, toolbar_options) {
            var self = this;
            self.buttons = {};
            self.toolbar_options = $.extend({},
                    $.toolbar.defaults, toolbar_options || {});
            $.each(buttons || [], function(i, button_options) {
                button_options.group = button_options.group || 'default';
                if (self.buttons[button_options.group] === undefined) {
                    self.buttons[button_options.group] = [];
                }
                self.buttons[button_options.group].push(
                    new $.toolbar.Button(button_options, self.toolbar_options));
            });
        },
        render: function() {
            var self = this, el = $('<div/>');
            $.each(self.buttons, function(name) {
                el.append(self.render_group(name));
            });
            return el.children();
        },
        render_group: function(name) {
            var self = this,
                group_klass = self.toolbar_options.group_klass,
                group_klass_prefix = self.toolbar_options.group_klass_prefix,
                el = $('<ul/>')
                    .addClass(group_klass)
                    .addClass(group_klass_prefix + name);
            name = name || 'default';
            $.each(self.buttons[name] || [], function(i, button) {
                el.append(button.render());
            });
            return el;
        }
    };
    // }}}

    // # Toolbar {{{
    $.toolbar.Toolbar.prototype = {
        init: function(el, buttons, options) {
            var self = this;

            self.buttons = buttons || [];
            self.options = $.extend({}, $.toolbar.defaults, options || {});
            self.groups = new $.toolbar.Groups(self.buttons, self.options);

            self.el = el.attr({
                id: self.options.iframe_id,
                name: self.options.iframe_name,
                allowtransparency: self.options.iframe_allowtransparency
                });

            self.resources = '';
            $.each(self.options.resources, function(i, resource) {
                self.resources += new $.toolbar.Resource(resource)
                        .render_as_string();
            });


        },
        render: function(buttons) {
            var self = this,
                groups = buttons ? new $.toolbar.Groups(
                            buttons, self.options) : self.groups;

            buttons = buttons ? buttons || [] : self.buttons;

            var el = $.toolbar._template(
                    self.options.template,
                    self.options.template_options(groups));


            // append css and javascript resources
            self.document = self.el.contents()[0];
            self.document.open();
            self.document.write(self.resources);
            self.document.close();

            self.el.load(function() {

                $('body', self.document).append(el);

                if (self.options.iframe_height === undefined) {
                    self.options.iframe_height = el.height();
                }

                // capture all clicks on toolbar
                $('.toolbar', self.document).bind('click', { self: self }, function(e) {
                    if (e.which === 1) {
                        var self = e.data.self,
                            streched_klass = self.options.iframe_streched_klass,
                            el = $(e.target);

                        if (self.el.hasClass(streched_klass)) {
                            self.shrink();
                        }

                        if (!$.nodeName(e.target, 'a')) {
                            el = el.parents('a');
                        }

                        // Buttons default to an overlay but if they
                        // have the '_parent' link target, just load them in
                        // the window
                        if (el.attr('target') == '_parent') {
                            window.parent.location.href = el.attr('href');
                        } else {
                            overlay(e);
                        }

                        return e.preventDefault();
                    }
                });

                $(self.el).trigger('toolbar_loaded');

            });


            return el;
        },
        shrink: function() {
            var self = this,
                groups_klass = self.options.groups_klass,
                group_open_klass = self.options.group_open_klass,
                toolbar_document = self.el.contents();
            // we make sure all submenus are hidden and deactivated
            $('.' + groups_klass, toolbar_document).hide();
            $('.' + group_open_klass, toolbar_document)
                    .removeClass(group_open_klass);
            // shrinking iframe to its initial height
            self.el.height(self.options.iframe_height);
            // removing marker class which set iframe as stretched
            self.el.removeClass(self.options.iframe_streched_klass);
        },
        stretch: function() {
            var self = this;
            // we stretch iframe over whole top frame which should
            // be marked as transparent so user wont see it
            self.el.height($(document).height());
            // we also mark iframe as activates which means its
            // being stretched
            self.el.addClass(self.options.iframe_streched_klass);

        }
    };
    // }}}

    // # jQuery integration {{{
    $.fn.toolbar = function (buttons, options) {
        var self = this;

        // Check if we are dealing with iframe
        if (!$.nodeName(self[0], 'iframe')) {
            alert('This is not iframe!');
        }

        // Was toolbar initialized already?
        if (!self.data('toolbar')) {
            var toolbar = new $.toolbar.Toolbar(self, buttons, options);
            self.data('toolbar', toolbar);
        }

        // return Toolbar instance
        return self.data('toolbar');

    };
    // }}}

    // # Set up modal for the overlay {{{
    $('#toolbar-overlay').modal({show: false});

    // Plug in some things that needs to happen after loading an overlay.
    // 3rd party apps kan register their own
    $(document).bind('setupOverlay', function() {

        // Init plone forms if they exist
        if ($.fn.ploneTabInit) {
            $(this).ploneTabInit();
        }

        // Tinymce editable areas inside overlay
        $('textarea.mce_editable').each(function() {
            var config = new TinyMCEConfig($(this).attr('id'));
            config.init();
        });
    });

    // }}}

    // # Testing {{{
    //
    // expose toolbar internals for testing purposes
    if ($.toolbar.testing === true) {
        $.toolbar._ = {
            outerHtml: outerHtml,
            template: template,
            Resource: Resource,
            Button: Button,
            Groups: Groups,
            Toolbar: Toolbar
        };
    }
    // }}}

}(jQuery));
