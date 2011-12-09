// Version: 0.1 (not released)
//
// (c) 2011 Rok Garbas
// May be freely distributed under the BSD license.
//
// For all details and documentation:
// <http://plone.github.com/plone.toolbar.js>


(function ($) {

    // # Namespace
    //
    // ensure there is "plone" namespace
    $.plone = $.plone || {};

    // # Utilities

    // ## url join utility
    $.plone.url_join = function(base, relative) {

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

    // ## simple template
    $.plone.simple_template = function(template, data) {
        return template.replace(/%(\w*)%/g, function(m, key) {
            return data.hasOwnProperty(key) ? data[key] : "";
        });
    };


    $.plone.resources_css = function(resources) {
        var styles = [];
        $.each(resources, function(index, options) {
            var style = '';
            var item = $.extend({
                rendering: 'link',
                media: 'screen',
                rel: 'stylesheet',
                title: ''
            }, options);

            //
            if (item.rendering === 'link') {
                style = '<link type="text/css" ' +
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
        return $(styles.join(''));
    };

    $.plone.resources_js = function(resources) {
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
        return $(scripts.join(''));
    };

    // # Button

    // # Buttons
    var Buttons = function(buttons, global_options) {

        var categories = {};

        $.each(buttons, function(index, options) {

            var item = $.extend({
                title: '',
                url: '#',
                id: '',
                klass: '',
                category: 'default'
            }, options);

            var button = $('<a/>').attr({
                'href': item.url,
                'class': item.klass
            }).html(item.title);

            if (item.icon !== undefined && item.icon !== null) {
                button.prepend($('<img src="' + item.icon + '" />'));
            }

            var button_wrapper = $('<li/>').attr({
                'id': item.id,
                'class': 'toolbar-button'
            });
            button_wrapper.append(button);

            if (item.submenu !== undefined) {

                var submenu = new Buttons(item.submenu, global_options);

                $.each(submenu.categories, function(category, items) {
                    button_wrapper.append(
                        submenu.render_category(items, category,
                            'toolbar-submenu').hide());
                });

                button.click(function(e) {
                    var el = $(this).parent(),
                        iframe = global_options.iframe,
                        iframe_el = global_options.iframe.contents();

                    if (el.hasClass('activated')) {
                        el.removeClass('activated');
                        $('> ul', el).hide();
                        iframe.height(global_options.initial_height);
                        iframe.removeClass('toolbar-dropdown-activated');

                    } else {

                        $('.activated', iframe_el).removeClass('activated');
                        $('.toolbar-submenu', iframe_el).hide();

                        el.addClass('activated');
                        $('> ul', el).show();
                        global_options.iframe.height($(document).height());
                        global_options.iframe.addClass('toolbar-dropdown-activated');
                    }
                    return false;
                });

            }

            if (item.exec !== undefined) {
                item.exec.call(this, button_wrapper);
            }

            if (categories[item.category] === undefined) {
                categories[item.category] = [];
            }

            categories[item.category].push(button_wrapper);

        });

        function render_category(buttons, custom_category, custom_klass) {
            var category = custom_category || 'default',
                klass = custom_klass || 'toolbar-category toolbar-category-' + category,
                el = $('<ul/>').attr('class', klass);

            $.each(buttons, function(index, button) {
                el.append(button);
            });
            return el;
        }

        return {
            categories: categories,
            render_category: render_category
        };

    };


    // # Toolbar
    var Toolbar = function(options) {

        var el = $('<iframe/>', options.attributes),
            buttons = new Buttons(options.buttons, options),
            toolbar = $(options.toolbar_template);

        $.each(buttons.categories, function(category, items) {
            $('.toolbar-category-' + category, toolbar).replaceWith(function() {
                return buttons.render_category(items, category);
            });
        });

        $(document).ready(function() {

            $('body').prepend(el);

        });

        var css = $.plone.resources_css(options.resources_css);
        var js = $.plone.resources_js(options.resources_js);

        el.load(function() {

            var el_body = $('body', el.contents());

            options.iframe = el;
            options.initial_height = el.height();

            el.contents().bind('click', { options: options }, function(e) {
                var iframe = e.data.options.iframe,
                    el = e.data.options.iframe.contents(),
                    initial_height = e.data.options.initial_height;

                if (iframe.hasClass('toolbar-dropdown-activated')) {
                    $('.activated', el).removeClass('activated');
                    $('.toolbar-submenu', el).hide();
                    iframe.height(initial_height);
                    iframe.removeClass('toolbar-dropdown-activated');
                }

                if ($(e.target).parent().hasClass('toolbar-button')) {
                    window.location = $(e.target).attr('href');
                }

                return false;

            });

            el_body.append(css);
            el_body.append(toolbar);
            el_body.append(js);

        });

        // ## Toolbar API
        return {
            'el': el,
            'buttons': buttons
        };

    };


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

        // Was toolbar initialized already?
        if (!this.data('toolbar')) {
            console.log('Toolbar was not initialized on this iframe!');
            return {};
        }

        return this.data('toolbar');

    };

    // Initialization method
    $.plone.toolbar = function(custom_options) {

        // Merge custom provided option with our default ones
        var options = $.extend({
            attributes: {
                id: 'plone-toolbar',
                name: 'plone-toolbar',
                allowtransparency: 'true'
            },
            toolbar_template: '' +
                '<div class="toolbar-wrapper">' +
                ' <div class="toolbar">' +
                '  <div class="toolbar-top"></div>' +
                '  <div class="toolbar-right">' +
                '   <div class="toolbar-swirl"><div></div></div>' +
                '   <div class="toolbar-category-personalactions"></div>' +
                '  </div>' +
                '  <div class="toolbar-left">' +
                '   <div class="toolbar-category-rightactions"></div>' +
                '   <div class="toolbar-category-leftactions"></div>' +
                '  </div>' +
                ' </div>' +
                '</div>',
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
