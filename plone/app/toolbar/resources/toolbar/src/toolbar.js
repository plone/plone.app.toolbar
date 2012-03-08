$(document).ready(function() {
    // Shrink the iframe back down after closing a menu
    $(document).mousedown(function (event) {
        if (jQuery(event.target).parents('.actionMenu:first').length) {
            // target is part of the menu, so just return and do the default
            return true;
        }
        $('#plone-toolbar', window.parent.document).css({'height': ''});
    });
    // we stretch iframe over whole top frame which should
    // be marked as transparent so user wont see it
    $('dl.actionMenu dt.actionMenuHeader a').click(function (event) {
        var parent_doc = window.parent.document;
        $('#plone-toolbar', parent_doc).height(
            $(parent_doc).height());
    });

    // # overlay {{{
    function overlay(e) {
        var headers = {},
            selector = "#portal-column-content",
            el = $(e.target),
            href = el.closest('a').attr('href'),
            parent_doc = window.parent.document;
            modal = $('#toolbar-overlay', parent_doc),
            body = $('.modal-body', modal),
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

        // Clean up the url
        href = (href.match(/^([^#]+)/)||[])[1];
        headers['X-Theme-Disabled'] = "True";
        $.ajax({
            url: href,
            headers: headers,
            complete: function(jqXHR, status, response) {
                // Store the response as specified by the jqXHR object
                response = jqXHR.responseText;
                // If successful, inject the HTML into all the matched elements
                if (jqXHR.isResolved()) {
                    jqXHR.done(function( r ) {
                        response = r;
                    });
                    body.empty().html(jQuery("<div>").append(
                        response.replace(rscript, "")).find(
                        selector));
                }

                function setupOverlay(){
                    // Keep all links inside the overlay
                    $('a', body).on('click', overlay);

                    $(document).trigger('setupOverlay',
                        [modal, response, status]);
                }
                setupOverlay();
                modal.modal('show');
            }
        });
        e.preventDefault();
    }
    // }}}

    // capture all clicks on iframe
    $(document).bind('click', {
        self: self, document: document
    }, function(e) {
        if (e.which === 1) {
            var self = e.data.self,
                el = $(e.target);

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
