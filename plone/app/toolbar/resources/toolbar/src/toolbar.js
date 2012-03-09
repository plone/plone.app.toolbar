$(document).ready(function() {
    var toolbar = $('#plone-toolbar', window.parent.document);

    // Stretch iframe to height of parent doc
    function stretch(){
        toolbar.height(
            $(window.parent.document).height());
    }

    // Shrink iframe back to css determined size.
    function shrink(){
        toolbar.css({'height': ''});
    }

    // Shrink the iframe back down after closing a menu
    $(document).mousedown(function (event) {
        if (jQuery(event.target).parents('.actionMenu:first').length) {
            // target is part of the menu, so just return and do the default
            return true;
        }
        if ($('#toolbar-overlay').hasClass('in')){
            // Overlay is visible, don't shrink
            return true;
        }
        shrink();
    });

    // we stretch iframe over whole top frame which should
    // be marked as transparent so user wont see it
    $('dl.actionMenu dt.actionMenuHeader a').click(function (event) {
        stretch();
    });

    // # overlay {{{
    function overlay(e) {
        var el = $(e.target),
            href = el.closest('a').attr('href'),
            modal = $('#toolbar-overlay'),
            body = $('.modal-body', modal);

        if(href === undefined){
            return;
        }

        // Clean up the url, set toolbar skin
        href = (href.match(/^([^#]+)/)||[])[1];

        body.empty().load(href + ' #portal-column-content',
            function(response, error){
                function setupOverlay(){
                    // Keep all links inside the overlay
                    $('a', body).on('click', overlay);

                    // Init plone forms if they exist
                    if ($.fn.ploneTabInit) {
                        body.ploneTabInit();
                    }

                    // Tinymce editable areas inside overlay
                    $('textarea.mce_editable', body).each(function() {
                        var id = $(this).attr('id'),
                            config = new TinyMCEConfig(id);
                        // Forgive me for I am about to sin. But it does mean
                        // we can overlay it multiple times. If you know a
                        // better way, please share.
                        delete InitializedTinyMCEInstances[id];
                        config.init();
                    });

                    // Call any other event handlers
                    $(document).trigger('setupOverlay',
                        [modal, response, error]);

                }
                setupOverlay();
                stretch();
                // Shring iframe when the overlay is closed
                modal.on('hidden', function(e){ shrink(); });
                modal.modal('show');
            }
        );
        e.preventDefault();
    }
    // }}}

    // capture all clicks on toolbar
    $('#toolbar').on('click', function(e) {
        if (e.which === 1) {
            var el = $(e.target);

            if (!$.nodeName(e.target, 'a')) {
                el = el.closest('a');
            }

            // Buttons default to an overlay but if they
            // have the '_parent' link target, just load them in
            // the window
            if (el.attr('target') == '_parent') {
                return true;
            } else {
                overlay(e);
            }

            return e.preventDefault();
        }
    });

});
