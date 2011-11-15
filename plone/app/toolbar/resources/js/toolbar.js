/*
 */

(function ($) {

    var default_config = {
        actions: [{
            bind_to: '.dropdownLink',
            is_open: function(toolbar) {
                if ($('.dropdownItems:visible').length === 0) {
                    return false;
                } else {
                    return true;
                }
            }
        }]
    };

    function Toolbar(config, toolbar) {

        var toolbar_stretched = false;
        var toolbar_height = toolbar.outerHeight();
        var content_height = $(window.parent.document).height();

        //TODO: need to handle scroll offset:
        //      actually check if its being handled properly since its
        //      working in FF9

        //TODO: need to handle ovelays:
        //      not sure if this is part of "deco light" but functionelity
        //      should definetly be ported at some point

        function stretch() {
            //toolbar_offset = $(window.parent).scrollTop();
            //$('body', window.parent.document).css('overflow', 'hidden');
            //$(window.parent).scrollTop(toolbar_offset);
            toolbar.height(content_height);
            toolbar_stretched = true;
        }


        function shrink() {
            //$('body', window.parent.document).css('overflow', 'auto');
            //$(window.parent).scrollTop(toolbar_offset);
            toolbar.height(toolbar_height);
            toolbar_stretched = false;
        }


        // is somebody clicks on streched iframe then we shrink it
        $(window).bind('click', function(e) {
            if (toolbar_stretched === true) {
                shrink();
            }
            e.preventDefault();
        });


        config['actions'].every( function(item) {
            $(item.bind_to).bind('click', function(e) {
                if (toolbar_stretched === false) {
                    stretch();
                } else {
                    //if (item.is_open() === true) {
                        shrink();
                    //}
                }
                e.preventDefault();
            });
        });

        return {
            config: config,
            default_config: default_config,
            shrink: shrink,
            stretch: stretch
        };
    }

    $.fn.toolbar = function (custom_config) {

        // is plugin already installed
        if (this.data('toolbar')) {
            return this.data('toolbar');
        }

        // TODO: only instantiate if this if element we are refering to is iframe

        // "compile" configuration for widget
        var config = $.extend({}, default_config);
        $.extend(config, custom_config);

        //
        var toolbar = new Toolbar(config, $(this));
        this.data('toolbar', toolbar);
        return toolbar;

    };

}(jQuery));


/* 
 * Initialization of plone's toolbar
 */
$(document).ready(function () {
    $('#plone-toolbar', window.parent.document).toolbar([
        {
            bind_to: 'dt.actionMenuHeader a',
            is_open: function() {
                if ($('dd.actionMenuContent:visible').length === 0) {
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]);
});
