// Version: 0.1 (not released)
//
// (c) 2011 Rok Garbas
//
// May be freely distributed under the BSD license.
//
// For all details and documentation:
// <http://garbas.github.com/plone.toolbar.js>

/*jslint browser:true, unparam:true, vars:true */
/*global jQuery:true, console:true */

(function ($) {
    "use strict";

    // # Namespace
    //
    // ensure there is "plone" namespace
    $.plone = $.plone || {};

    // # Utilities
    //
    // ensure there is "plone.utils" namespace
    $.plone.utils = $.plone.utils || {};

    // ## resources_css
    //
    // Utility which creates link/style element from resources_css passed
    // as argument.
    //
    // Code was taken from Products.ResourceRegistries and converted into
    // javascript.
    //
    // Example:
    //
    //     $.plone.utils.resources_css([
    //         {src: 'main.css'},
    //         {rendering: 'import', src: 'main.css'},
    //         {rendering: 'inline', content: '* { margin: 0; }'},
    //         {conditionalcomment: 'IE 6', src: 'main.css'},
    //     ]);
    //     
    // Which will output...
    //
    //     <link media="screen" rel="stylesheet" title="" href="main.css" />
    //
    //     <style type="text/css" media="screen">
    //         @import url(main.css);
    //     </style>
    //
    //     <style type="text/css" media="screen">
    //          * { margin: 0; }
    //     </style>
    //
    //     <!--[if IE 6]>
    //     <link media="screen" rel="stylesheet" title="" href="main.css" />
    //     <![endif]-->
    //
    $.plone.utils.resources_css = function (resources) {

        // here we will collect all resources as list of strings
        var styles = [];

        // processing every resource in resources list
        $.each(resources, function (index, options) {

            // end style string which we will append to styles variable
            var style = '';

            // default values for css resource
            var item = $.extend({
                rendering: 'link',
                media: 'screen',
                rel: 'stylesheet',
                title: ''
            }, options);

            // include css as link element
            if (item.rendering === 'link') {
                style = '<link type="text/css" ' +
                    'href="' + item.src + '" ' +
                    'media="' + item.media + '" ' +
                    'rel="' + item.rel + '" ' +
                    'title="' + item.title + '"' +
                    '/>';

            // include css as style element which is importing/pointing to
            // other css
            } else if (item.rendering === 'import') {
                style = '<style type="text/css" media="' + item.media + '">' +
                    '    @import url(' + item.src + ');' +
                    '</style>';

            // include css as inline css inside style element
            } else if (item.rendering === 'inline') {
                style = '<style type="text/css" media="' + item.media + '">' +
                    item.content + '</style>';
            }

            // wrap around with conditional comment
            if (item.conditionalcomment) {
                style = '<!--[if ' + item.conditionalcomment + ']>' +
                    style + '<![endif]-->';
            }

            // add style string to styles list
            styles.push(style);

        });

        // join and return as string
        return styles.join('');

    };

    // ## resources_js
    //
    // Utility which creates script element from resources_js passed as
    // argument.
    //
    // Code was taken from Products.ResourceRegistries and converted into
    // javascript.
    //
    // Example:
    //
    //     $.plone.utils.resources_js([
    //         {src: 'main.js'},
    //         {inline: true, content: 'console.log("test"); '},
    //         {conditionalcomment: 'lte IE 6', src: 'main.js'}
    //     ]);
    //     
    // Which will output...
    //
    //     <script type="text/javascript" src="main.js"></script>
    //
    //     <script type="text/javascript">
    //         console.log("test");
    //     </script>
    //
    //     <!--[if lte IE 6]>
    //     <script type="text/javascript" src="main.js"></script>
    //     <![endif]-->
    //
    $.plone.utils.resources_js = function (resources) {

        // here we will collect all resources as list of strings
        var scripts = [];

        // processing every resource in resources list
        $.each(resources, function (index, item) {

            // include javascript as script element
            var script = '<scr' + 'ipt type="text/javascript"';

            // as javascript code inside element
            if (item.inline) {
                script += '>' + item.content;

            // as pointing to javascript file
            } else {
                script += ' src="' + item.src + '">';
            }

            // closing script element
            script += '</scr' + 'ipt>';

            // wrap around with conditional comment
            if (item.conditionalcomment) {
                script = '<!--[if ' + item.conditionalcomment + ']>' +
                    script + '<![endif]-->';
            }

            // add script string to styles list
            scripts.push(script);

        });

        // join and return as string
        return scripts.join('');

    };

    // # Buttons
    //
    // Here we cover logic of how buttons and categories are render, but not
    // where they are placed, except in the case of submenus.
    var Buttons = function (buttons, global_options) {

        // registry of categories inside which buttons are listed
        var categories = {};

        // we group buttons into categories
        $.each(buttons, function (index, options) {

            // default options of a button
            var item = $.extend({
                title: '',
                url: '#',
                id: '',
                klass: '',
                category: 'default'
            }, options);

            // we represent button as "a" element
            var button = $('<a/>').attr({
                'href': item.url,
                'class': item.klass
            }).html(item.title);

            // if icon was defined we create img element and insert it into
            // button element
            if (item.icon !== undefined && item.icon !== null) {
                button.prepend($('<img src="' + item.icon + '" />'));
            }

            // we wrap button ("a" element) with "li" element
            var button_wrapper = $('<li/>').attr({
                'id': item.id,
                'class': 'toolbar-button'
            });

            // we now append button to button wrapper element
            button_wrapper.append(button);

            // if submenu is defined here is how we create it
            if (item.submenu !== undefined) {

                // we instantiate Buttons as they were before just now we pass
                // submenu since this is now our sub list of buttons
                var submenu = new Buttons(item.submenu, global_options);

                // for each category we append buttons
                $.each(submenu.categories, function (category, items) {
                    button_wrapper.append(submenu.render_category(items, category, 'toolbar-submenu').hide());
                });

                // on click we should 
                button.click(function (e) {

                    var el = $(this).parent(),  // current button
                        iframe = global_options.iframe,  // iframe element 
                        iframe_doc = global_options.iframe.contents();  // iframe document 

                    // closing submenu
                    if (el.hasClass('activated')) {

                        // removing marker class which was marking button as
                        // activated / open
                        el.removeClass('activated');

                        // hiding submenu
                        $('> ul', el).hide();

                        // shrinking iframe to its initial height
                        iframe.height(global_options.initial_height);

                        // removing marker class which set iframe as stretched
                        iframe.removeClass('toolbar-dropdown-activated');

                    // opening submenu
                    } else {

                        // we make sure all submenus are hidden and deactivated
                        $('.activated', iframe_doc).removeClass('activated');
                        $('.toolbar-submenu', iframe_doc).hide();

                        // we provide helper class object so themes can style when
                        // dropdown of submenu is activated / open
                        el.addClass('activated');

                        // we show submenu, was initialy hidden
                        $('> ul', el).show();

                        // we stretch iframe over whole top frame which should
                        // be marked as transparent so user wont see it
                        global_options.iframe.height($(document).height());

                        // we also mark iframe as activates which means its
                        // being stretched
                        global_options.iframe.addClass('toolbar-dropdown-activated');

                    }

                    // if submenu is define we defer click on button
                    return false;

                });

            }

            // if some custom code is needed we use ``exec`` option
            if (item.exec !== undefined) {
                item.exec.call(this, button_wrapper);
            }

            // if category does not yet exists we create it
            if (categories[item.category] === undefined) {
                categories[item.category] = [];
            }

            // appending button to category
            categories[item.category].push(button_wrapper);

        });

        // this is helper function to render category
        function render_category(buttons, custom_category, custom_klass) {

            // we can provide custom options for rendering (custom_category,
            // custom_klass)
            var category = custom_category || 'default',
                klass = custom_klass || 'toolbar-category toolbar-category-' + category,
                el = $('<ul/>').attr('class', klass);

            // appending buttong to category element
            $.each(buttons, function (index, button) {
                el.append(button);
            });

            // return category element
            return el;
        }

        // Buttons API
        return {
            categories: categories,
            render_category: render_category
        };

    };


    // # Toolbar
    //
    // Here we create iframe and initialize buttons and map them to categories
    // which were predefined in template or we simple append them
    var Toolbar = function (options) {

        var el = $('<iframe/>', options.attributes),  // iframe element
            buttons = new Buttons(options.buttons, options),  // buttons instance
            toolbar = $(options.toolbar_template),  // toolbar default structure
            css = $.plone.utils.resources_css(options.resources_css),  // css resources string
            js = $.plone.utils.resources_js(options.resources_js);  // javascript resources string

        // render categories and append them iframe
        $.each(buttons.categories, function (category, items) {

            // toolbar category which we are searching in template
            var category_el = $('.toolbar-category-' + category, toolbar);

            // if no category found in template then we append it
            if (category_el.length === 0) {
                $('.toolbar', toolbar).append(buttons.render_category(items, category));

            // replace category element with generated category with buttons
            } else {
                category_el.replaceWith(function () {
                    return buttons.render_category(items, category);
                });
            }

        });

        // when iframe is loaded
        el.load(function () {

            // append css and javascript resorces
            el[0].contentWindow.document.open();
            el[0].contentWindow.document.write('<html><head></head><body>' + css + js + '</body></html>');
            el[0].contentWindow.document.close();

            // iframe body element
            var el_body = $('body', el.contents());

            // we pass iframe as element in options later on we access it in
            // Buttons as global_options.iframe 
            options.iframe = el;

            // we also remember initial height since we will later use it when
            // creating overlay
            options.initial_height = el.height();

            // we need to check any click on iframe
            el.contents().bind('click', { options: options }, function (e) {

                var iframe = e.data.options.iframe,
                    el = e.data.options.iframe.contents(),
                    initial_height = e.data.options.initial_height;

                // if iframe is stretched then we shrink it
                if (iframe.hasClass('toolbar-dropdown-activated')) {
                    $('.activated', el).removeClass('activated');
                    $('.toolbar-submenu', el).hide();
                    iframe.height(initial_height);
                    iframe.removeClass('toolbar-dropdown-activated');
                }

                // if click on button was made then we redirect main frame to
                // new location
                if ($(e.target).closest('a').parent().hasClass('toolbar-button')) {
                    window.parent.location.href = $(e.target).closest('a').attr('href');
                }

                // we ignore any other click
                return e.preventDefault();

            });

            // append toolbar element to iframe body 
            el_body.append(toolbar);

        });

        // when document is ready we prepend iframe to body
        $(document).ready(function () {
            $('body').prepend(el);
        });


        // toolbar api
        return {
            'el': el,
            'buttons': buttons,
            'create_buttons': function(buttons, global_options) {
                return new Buttons(buttons, global_options);
            }
        };

    };


    // # Initialization
    //
    // Initialization of toolbar, as well as retriving, destroying and
    // manipulation already created toolbar.

    // Method for retriving already created toolbar
    $.fn.toolbar = function () {

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

        // return Toolbar instance
        return this.data('toolbar');

    };

    // Initialization method
    $.plone.toolbar = function (custom_options) {

        // Merge custom provided option with default ones
        var options = $.extend({
            attributes: {
                id: 'plone-toolbar',
                name: 'plone-toolbar',
                allowtransparency: 'true'
            },
            toolbar_template: '<div class="toolbar-wrapper">' +
                              ' <div class="toolbar"></div>' +
                              '</div>',
            buttons: []
        }, custom_options);

        // Initialize Toolbar
        var toolbar = new Toolbar(options);

        // Save Toolbar instance to iframe element data
        $(toolbar.el).data('toolbar', toolbar);

        // Return toolbar as we would with $.fn.toolbar
        return toolbar;

    };

}(jQuery));
