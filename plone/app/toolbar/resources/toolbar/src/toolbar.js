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

    // # outerHtml {{{
    function outerHtml(el) {
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
    // }}}

    // # Micro Templating {{{
    function template(tmpl, data) {
        tmpl = $(tmpl);
        $.each(data, function(key, el) {
            if (typeof(el) === 'string') {
                $(key, tmpl).append(el);
            } else if (el.size() !== 0) {
                $(key, tmpl).append(el);
            }
        });
        return tmpl;
    }
    // }}}

    // # Namespace {{{
    $.toolbar = $.toolbar || {};
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
            category: 'default'
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
    var Resource = function(r, a) { this.init(r, a); return this; };
    Resource.prototype = {
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
            return outerHtml(this.render());
        }
    };
    // }}}

    // # Models definitions {{{
    var Button = function(o, t) { this.init(o, t); return this; },
        Groups = function(o, t) { this.init(o, t); return this; },
        Toolbar = function(e, b, o) { this.init(e, b, o); return this; };
    // }}}

    // # Button {{{
    Button.prototype = {
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
                var self = e.data.self, el = self.el,
                    groups_klass = self.toolbar_options.groups_klass,
                    group_open_klass = self.toolbar_options.group_open_klass,
                    iframe_id = self.toolbar_options.iframe_id,
                    toolbar = $('iframe#' + iframe_id).toolbar();

                if ($('> div.' + groups_klass, el).size() === 0) {
                    return;
                }

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
                groups = new Groups(buttons, self.toolbar_options);

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
    Groups.prototype = {
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
                    new Button(button_options, self.toolbar_options));
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
    Toolbar.prototype = {
        init: function(el, buttons, options) {
            var self = this;

            self.buttons = buttons || [];
            self.options = $.extend({}, $.toolbar.defaults, options || {});
            self.groups = new Groups(self.buttons, self.options);

            self.el = el.attr({
                id: self.options.iframe_id,
                name: self.options.iframe_name,
                allowtransparency: self.options.iframe_allowtransparency
                });

            self.resources = '';
            $.each(self.options.resources, function(i, resource) {
                self.resources += new Resource(resource).render_as_string();
            });


        },
        render: function(buttons) {
            var self = this,
                groups = buttons ? new Groups(buttons, self.options) : self.groups;

            buttons = buttons ? buttons || [] : self.buttons;

            var el = template(
                    self.options.template,
                    self.options.template_options(groups)),
                iframe_document = self.el.contents()[0];

            // append css and javascript resources
            iframe_document.open();
            iframe_document.write(self.resources);
            iframe_document.close();

            self.el.load(function() {

                $('body', iframe_document).append(el);

                if (self.options.iframe_height === undefined) {
                    self.options.iframe_height = el.height();
                }

                // capture all clicks on iframe
                $(iframe_document).bind('click', {
                    self: self, iframe_document: iframe_document
                }, function(e) {
                    var self = e.data.self,
                        streched_klass = self.options.iframe_streched_klass,
                        el = $(e.target);

                    if (self.el.hasClass(streched_klass)) {
                        self.shrink();
                    }

                    if (!$.nodeName(e.target, 'a')) {
                        el = el.parents('a');
                    }

                    // if click on button was made then we redirect main
                    // frame to new location
                    if (el.parent().hasClass(self.options.button_klass)) {
                        window.parent.location.href = el.attr('href');
                    }

                    return e.preventDefault();

                    // TODO: do check for overlay to not shrink toolbar if
                    // overlay is opened
                });

            });

            return el;
        },
        shrink: function() {
            var self = this,
                groups_klass = self.options.groups_klass,
                group_open_klass = self.options.group_open_klass,
                iframe_document = self.el.contents();
            // we make sure all submenus are hidden and deactivated
            $('.' + groups_klass, iframe_document).hide();
            $('.' + group_open_klass, iframe_document).removeClass(group_open_klass);
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
            var toolbar = new Toolbar(self, buttons, options);
            self.data('toolbar', toolbar);
        }

        // return Toolbar instance
        return self.data('toolbar');

    };
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
