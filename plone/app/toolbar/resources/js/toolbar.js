// Version: 0.1 (not released)
//
// (c) 2011 Rok Garbas
// May be freely distributed under the BSD license.
//
// For all details and documentation:
// <http://garbas.github.com/jquery.toolbar.js>


(function ($) {

    var url_join = function(base, relative) {

        // return "empty" links
        if (relative === '#') {
            return relative;
        }

        // See if there is already a protocol on this
        if (relative.indexOf("://") != -1) {
            return relative;
        }

        // See if this is protocol-relative
        if (relative.indexOf("//") === 0) {
            var protocolIndex = base.indexOf("://");
            return base.substr(0, protocolIndex+1) + relative;
        }

        // We need to split the domain and the path for the remaining options
        var protocolIndexEnd = base.indexOf("://") + 3;

        // append slash if passed only http://bla.com
        if (base.indexOf("/", protocolIndexEnd) == -1) {
            base += "/";
        }

        var endDomainIndex = base.indexOf("/", protocolIndexEnd);
        var domain = base.substr(0, endDomainIndex);
        var path = base.substr(endDomainIndex);

        // trim off any ending file name
        if (path.lastIndexOf("/") != path.length-1) {
            path = path.substr(0, path.lastIndexOf("/")+1);
        }

        // See if this is site-absolute
        if (relative.indexOf("/") === 0) {
            return domain + relative;
        }

        // See if this is document-relative with ../
        while (relative.indexOf("../") === 0) {
            relative = relative.substr(3);
            if (path.length > 1) {
                var secondToLastSlashIndex = path.substr(0, path.length-1).lastIndexOf("/");
                path = path.substr(0, secondToLastSlashIndex+1);
            }
        }

        // Finally, slap on whatever ending is left
        return domain + path + relative;
    };

    var ctor = function() {};

    var inherits = function(parent, protoProps, staticProps) {
        var child;

        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function(){ return parent.apply(this, arguments); };
        }

        $.extend(child, parent);

        ctor.prototype = parent.prototype;
        child.prototype = new ctor();

        if (protoProps) $.extend(child.prototype, protoProps);
        if (staticProps) $.extend(child, staticProps);

        child.prototype.constructor = child;

        child.__super__ = parent.prototype;

        return child;
    };

    var extend = function (protoProps, classProps) {
        var child = inherits(this, protoProps, classProps);
        child.extend = this.extend;
        return child;
    };

    var View = function(options) {
        this._configure(options || {});
        this._ensureElement();
        this.initialize.apply(this, arguments);
    };

    $.extend(View.prototype, {

        tagName: 'div',

        $: function(selector) {
            return $(selector, this.el);
        },

        initialize: function() {},

        _configure: function(options) {

            // set options chain
            if (this.options) {
                options = $.extend({}, this.options, options);
            }

            var special = ['el', 'attributes', 'className', 'tagName'];
            for (var id in special) {
                var attr = special[id];
                if (options[attr]) {
                    this[attr] = options[attr];
                }
            }

            this.options = options;

        },

        _ensureElement : function() {
            if (!this.el) {
                var attrs = this.attributes || {};
                if (this.id) {
                    attrs.id = this.id;
                }
                if (this.className) {
                    attrs['class'] = this.className;
                }
                this.el = this._make(this.tagName, attrs);
            } else if (typeof(this.el) === 'string') {
                this.el = $(this.el).get(0);
            }
        },

        _make: function(tagName, attributes, content) {
            var el = document.createElement(tagName);
            if (attributes) $(el).attr(attributes);
            if (content) $(el).html(content);
            return el;
        }

    });

    View.extend = extend;



    // # Views
    var view = {};

    // ## Buttons View
    view.Buttons = View.extend({

        initialize: function() {
            this.render();
        },

        render: function() {
            var self = this;
            var renderButton = this.renderButton;
            $.each(this.options.buttons, function(index, item) {
                renderButton.apply(self, [item]);
            });
        },

        add: function(item) {
            this.options.buttons.push(item);
            this.renderButton(item);
        },

        renderButton: function(item) {

            var options = $.extend({
                id: '',
                url: '#',
                klass: 'button',
                category: 'default',
                buttons: [],
                events: [],
                initialize: function() {}
            }, item);

            var button = $('<a/>', {
                'href': url_join(window.location.href, options.url),
                'id': options.id,
                'class': options.klass
            });
            button.html(options.title);

            var button_wrapper = $('<li/>');
            button_wrapper.append(button);

            if (options.buttons.length !== 0) {

                var buttons = new view.Buttons({
                    buttons: options.buttons,
                    iframe: options.iframe
                });
                button_wrapper.append(buttons.el);

                $(buttons.el).hide();

                button.bind('click', {
                    button: button_wrapper,
                    submenu: buttons.el,
                    iframe: this.options.iframe
                }, function(event) {
                    $(event.data.button).addClass('active');
                    $(event.data.submenu).show();
                    $(event.data.iframe.el).height($(window.document).height());

                    event.stopPropagation();
                    $(event.data.iframe.el).contents().bind('click', {
                        button: event.data.button,
                        submenu: event.data.submenu,
                        iframe: event.data.iframe
                    }, function(event) {
                        $(event.data.button).removeClass('active');
                        $(event.data.submenu).hide();
                        $(event.data.iframe.el).height(event.data.iframe.initial_height);
                    });
                });
            }

            var category_name = 'toolbar-category-' + options['category'];

            var category = this.$('div.'+category_name);
            if (category.length === 0)  {
                category = $('<div/>', {'class': category_name});
                category.html('<ul></ul>');
                $(this.el).append(category);
            }

            this.$('div.' + category_name +' > ul').append(button_wrapper);
        }


    });

    // ## IFrame View
    view.IFrame = View.extend({

        tagName: 'iframe',
        attributes: { allowtransparency: 'true' },

        initialize: function() {

            // attributes
            var options = {
                'id': this.options.id,
                'src': this.options.src,
                'class': this.options.klass,
                'name': this.options.name
            };

            // Apply custom options to element
            for (var attr in options) {
                $(this.el).attr(attr, options[attr]);
            }

            // Imidiatly uppon creation we render
            this.render();

        },

        renderStyles: function(item) {
            return $('<link rel="stylesheet" type="text/css" href="' +
                    url_join(window.location.href, item) + '" />');
        },

        renderScripts: function(item) {
            return $('<script type="text/javascript"" src="' +
                    url_join(window.location.href, item) + '"></script>');
        },

        renderCSSResources: function(resources) {
            var styles = [];
            $.each(resources, function(index, item) {
                var style = '';

                // 
                if (item.rendering === 'link') {
                    style = '<link rel="stylesheet" type="text/css" ' +
                            'href="' + item.src + '" ' +
                            'media="' + item.media + '" ' +
                            'rel="' + item.rel + '" ' +
                            'title="' + item.title + '" />';

                //
                } else if (item.rendering === 'import') {
                    style = '<style type="text/css" media="' + item.media + '">' +
                            '@import url(' + item.src + ');' +
                            '</style>';

                //
                } else if (item.rendering === 'inline') {
                    style = '<style type="text/css" media="' + item.media + '">' +
                            item.content +
                            '</style>';
                }

                // conditional comment
                if (item.conditionalcomment) {
                    style = '<!--[if]>' + style + '<![endif]-->';
                }

                styles.push(style);
            });
            return styles;
        },

        renderJSResources: function(resources) {
            var scripts = [];
            $.each(resources, function(index, item) {

                // include script inline
                var script = '<scr' + 'ipt type="text/javascript"';
                if (item.inline) {
                    script += '>' + item.content;

                // include script via src attribute
                } else {
                    script += ' src="' + item.src + '">';
                }
                script += '</scr' + 'ipt>';

                // conditional comment
                if (item.conditionalcomment) {
                    script = '<!--[if]>' + script + '<![endif]-->';
                }

                scripts.push(script);
            });
            return scripts;

        },

        render: function() {

            var self = this;

            var buttons = new view.Buttons({
                className: 'toolbar',
                buttons: this.options.buttons,
                iframe: this
            });

            var toolbar_wrapper = $('<div/>', {'class': 'toolbar-wrapper'});
            toolbar_wrapper.append(buttons.el);

            // Basic styles
            var el = $(this.el);
            el.css({
                'overflow': 'hidden',
                'background': 'transparent',
                'width': '100%'
            });

            $(document).ready(function() {

                $('body').prepend(el);

            });

            var css_resources = this.renderCSSResources(this.options.css_resources);
            var js_resources = this.renderJSResources(this.options.js_resources);

            el.load(function() {

                var el_body = $('body', el.contents());

                el_body.append(css_resources.join(''));
                el_body.append(toolbar_wrapper);
                el_body.append(js_resources.join(''));

                self.initial_height = el_body.height();

                $('a', el.contents()).bind('click', {
                    window: window
                }, function(event) {

                    var url = $(event.target).attr('href');

                    if (url !== '#') {

                        window.location = url;

                    }

                    return false;
                });

            });

        }


    });


    var Toolbar = view.IFrame;


    // # Initialization
    //
    // Initialization of toolbar, as well as retriving, destroying and
    // mnipulation already created toolbar.

    // Method for retriving already created toolbar
    $.fn.toolbar = function() {

        // Check if we are dealing with iframe
        if (this.tagName === 'IFRAME') {
            console.log('This is not iframe!');
            return {};
        }

        // Was toolbar initialized
        if (!this.data('toolbar')) {
            console.log('Toolbar was not initialized on this iframe!');
            return {};
        }

        return this.data('toolbar');

    };

    // Initialization method
    $.toolbar = function(custom_options) {

        // Merge custom provided option with our default ones
        var options = $.extend({
            id: 'toolbar',
            src: '',
            name: 'toolbar',
            klass: '',
            klass_category_prefix: 'toolbar-category-',
            css_resources: [],
            js_resources: [],
            buttons: []
        }, custom_options);

        // Initialize toolbar
        var toolbar = new Toolbar(options);

        // Save toolbar object to iframe element
        $(toolbar.el).data('toolbar', toolbar);

        // Return toolbar as we would with $.fn.toolbar
        return toolbar;

    };


})(jQuery);
