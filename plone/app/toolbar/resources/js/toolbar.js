// Version: 0.1 (not released)
//
// (c) 2011 Rok Garbas
// May be freely distributed under the BSD license.
//
// For all details and documentation:
// <http://garbas.github.com/jquery.toolbar.js>


(function ($) {
    /*
    // # Namespace
    $.toolbar = {};

    // # Default options
    $.toolbar.options = $.toolbar.default_options = {
        id: 'jquery-toolbar',
        name: 'jquery-toolbar',
        klass: 'toolbar',
        klass_category_prefix: 'toolbar-category-',
        buttons: []
    };

    // # Router
    var Router = Backbone.Router.extend({

        initialize: function(options) {

            $.toolbar.iframe = new $.toolbar.view.IFrame(options);

        }

    });



    // # Models
    $.toolbar.models = {};

    // ## Button
    $.toolbar.models.Button = Backbone.Model.extend({
        initialize: function() {
            if (this.get('category') === undefined) {
                this.set({ category: 'default' });
            }
        }
    });



    // # Collections
    $.toolbar.collection = {};

    // ## Buttons
    $.toolbar.collection.Buttons = Backbone.Collection.extend({
        model: $.toolbar.models.Button
    });
    $.toolbar.buttons = new $.toolbar.collection.Buttons();



    // # Views
    $.toolbar.view = {};

    // ## IFrame
    $.toolbar.view.IFrame= Backbone.View.extend({
        tagName: 'iframe',
        attributes: { allowtransparency: 'true' },

        initialize: function() {
            this.render();
        },

        render: function() {

            var iframe_el = $(this.el);

            $('body').prepend(iframe_el);

            var buttons = new $.toolbar.view.Buttons({
                className: 'toolbar',
                collection: $.toolbar.buttons
            });

            // Add buttons to toolbar
            _.forEach($.toolbar.options.buttons, function(item) {
                $.toolbar.buttons.add(item);
            });

            // Basic styles
            iframe_el.css('background', 'trasparent !important');
            iframe_el.css('width', '100%');

            iframe_el.load(function() {

                var toolbar_wrapper = $('<div/>', {'class': 'toolbar-wrapper'});

                toolbar_wrapper.append(buttons.el);

                $('body', $($.toolbar.iframe.el).contents()).prepend(toolbar_wrapper);

                $.toolbar.iframe.height = $($.toolbar.iframe.el).height();

                $('a', $($.toolbar.iframe.el).contents()).bind('click', {
                    window: window
                }, function(event) {

                    var url = $(event.target).attr('href');

                    if (url !== '#') {

                        window.location = url;

                    }
                });

            });

            return this;
        },

        make: function(tagName, attributes, content) {
            _.extend(attributes, {
                'id':     this.options.id,
                'src':    this.options.src,
                'class':  this.options.klass,
                'name':  this.options.name
            });
            var el = document.createElement(tagName);
            if (attributes) $(el).attr(attributes);
            return el;

        }

    });

    // ## Buttons
    $.toolbar.view.Buttons = Backbone.View.extend({

        initialize: function(options) {
            options.collection.bind('add', this.renderItem, this);
        },

        renderItem: function(model) {
            var button = new $.toolbar.view.Button({model: model});

            var category_name = $.toolbar.options.klass_category_prefix +
                model.get('category');

            var category = this.$('.'+category_name);
            if (category.length === 0)  {
                category = $('<div/>', {'class': category_name});
                category.html('<ul></ul>');
                $(this.el).append(category);
            }

            this.$('div.' + category_name +' > ul').append(button.el);
        }

    });

    // ## Button
    $.toolbar.view.Button = Backbone.View.extend({
        tagName: 'li',

        initialize: function() {
            this.render();
        },

        render: function() {

            var options = _.extend({
                id: '',
                url: '#',
                klass: 'button',
                submenu: [],
                events: [],
                initialize: function() {}
            }, this.model.attributes);

            this.renderButton($(this.el), options);

        },

        renderButton: function(el, options) {

            var button = $('<a/>', {
                'id': options.id,
                'class': options.klass,
                'href': $.toolbar.utils.url_join(window.location.href, options.url)
            });
            button.html(options.title);
            el.html(button);

            options.initialize(this);

            if (options.submenu.length > 0) {

                var collection = new $.toolbar.collection.Buttons();

                this.submenu = new $.toolbar.view.Buttons({
                    className: 'toolbar-submenu',
                    collection: collection
                });
                el.append(this.submenu.el);

                $(this.submenu.el).hide();

                button.bind('click', { button: this }, function(event) {
                    $(event.data.button.el).addClass('active');
                    $(event.data.button.submenu.el).show();
                    $($.toolbar.iframe.el).height($(window.document).height());

                    event.stopPropagation();
                    $($.toolbar.iframe.el).contents().bind('click', {
                        button: event.data.button
                    }, function(event) {
                        $(event.data.button.el).removeClass('active');
                        $(event.data.button.submenu.el).hide();
                        $($.toolbar.iframe.el).height($.toolbar.iframe.height);
                    });
                });

                // bellow is "hover" version of button
                //button.bind('mouseenter', { button: this }, function(event) {
                //    $(event.data.button.el).addClass('active');
                //    $(event.data.button.submenu.el).show();
                //    $($.toolbar.iframe.el).height($(window.document).height());
                //});
                //$(this.el).bind('mouseleave', { button: this
                //}, function(event) {
                //    $(event.data.button.el).removeClass('active');
                //    $(event.data.button.submenu.el).hide();
                //    $($.toolbar.iframe.el).height($.toolbar.iframe.height);
                //});

                _.forEach(options.submenu, function(item) {
                    this.submenu.collection.add(item);
                }, this);

            }

            button.bind(options.events);

        }

    });


    // # Initialization method
    $.toolbar.initialize = function(custom_options) {

        $.toolbar.options = _.extend($.toolbar.default_options, custom_options);

        $(document).ready(function() {

            $.toolbar.router = new Router($.toolbar.options);

        });
    };

    // #
    $.toolbar.remove = function() {
        $.toolbar.options = $.toolbar.default_options;
        $.toolbar.iframe.remove();
        $.toolbar.buttons = new $.toolbar.collection.Buttons();
        console.log('reseting toolbar');
    };
    */

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
        renderResources: function(resources) {
            var styles = [];
            var scripts = [];
            var renderStyles = this.renderStyles;
            var renderScripts = this.renderScripts;

            $.each(resources, function(index, item) {

                if (item.substring(item.length - 4, item.length) === '.css') {
                    styles.push(renderStyles(item));
                } else if (item.substring(0, 4) === 'css!') {
                    styles.push(renderStyles(item.substring(4, item.length)));
                } else if (item.substring(item.length - 3, item.length) === '.js') {
                    scripts.push(renderScripts(item));
                } else if (item.substring(0, 3) === 'js!') {
                    scripts.push(renderScripts(item.substring(3, item.length)));
                }

            });

            styles.concat(scripts);
            return styles;

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

            var resources = this.renderResources(this.options.resources);

            el.load(function() {

                var el_body = $('body', el.contents());

                el_body.prepend(toolbar_wrapper);

                $.each(resources, function(index, item) {
                    el_body.prepend(item);
                });

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
            resources: [],
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
