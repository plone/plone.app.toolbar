// Version: 0.1 (unrelised)  
// (c) 2011 Rok Garbas  
// May be freely distributed under the BSD license.
//
// For all details and documentation:  
// <http://garbas.github.com/jquery.toolbar.js>

(function ($) {

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

            $('body').prepend(this.el);

            var buttons = new $.toolbar.view.Buttons({
                className: 'toolbar',
                collection: $.toolbar.buttons
            });

            // Add buttons to toolbar
            _.forEach($.toolbar.options.buttons, function(item) {
                $.toolbar.buttons.add(item);
            });

            $(this.el).load(function() {

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

    
    // # Utils
    $.toolbar.utils = {};

    // ## Absolute URL
    //
    // TODO: needs tests
    // taken from http://stackoverflow.com/q/8014921
    $.toolbar.utils.url_join = function(base, relative) {

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

    // # Initialization method
    $.toolbar.initialize = function(custom_options) {

        $.toolbar.options = _.extend($.toolbar.default_options, custom_options);

        $(document).ready(function() {

            $.toolbar.router = new Router($.toolbar.options);

        });
    };

    $.toolbar.remove = function() {
        $.toolbar.options = $.toolbar.default_options;
        $.toolbar.iframe.remove();
        $.toolbar.buttons = new $.toolbar.collection.Buttons();
        console.log('reseting toolbar');
    };

})(jQuery);
