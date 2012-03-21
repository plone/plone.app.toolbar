(function($) {
    "use strict";


    // # Namespace {{{
    $.plone = $.plone || {};
    // }}}

    // # Defaults {{{
    $.plone.overlays = $.extend(true, {
        'default': {
            'h1.documentFirstHeading': '.modal-header h3',
            'div > #document-base-edit:parent': '.modal-body'
        }
    }, $.plone.overlays || {});
    // }}}

    // 
    function overlay(href, iframe, id) {
        var overlay = $('#plone-overlay'),
            content_mapping = $.plone.overlays['default'];

        if (id !== undefined && $.plone.overlays[id] !== undefined) {
            content_mapping = $.extend({}, content_mapping, $.plone.overlays[id]);
        }

        // Clean up the url, set toolbar skin
        if (href === undefined) { return; }
        href = (href.match(/^([^#]+)/)||[])[1];

        $.get(href, function(data) {
            var content = $('<div/>').html(data);

            $.each(content_mapping, function(source, target) {
                $(target, overlay).html(content.find(source).html());
            });

            function clear_template() {
                $.each(content_mapping, function(source, target) {
                    $(target, overlay).html('');
                });
            }

            // TODO: this part should be pluggable
            // Keep all links inside the overlay (except for
            // the folder_contents overlay)
            $('a', $('.modal-body', overlay)).on('click', function(e){
                if ($('#folderlisting-main-table', overlay).length) {
                    if ($(e.target).attr('href').slice(-16) == '/folder_contents') {
                        overlay($(e.target).attr('href'), iframe);
                        return e.preventDefault();
                    } else {
                        window.parent.location.href = $(e.target).attr('href');
                    };
                } else {
                    overlay($(e.target).attr('href'), iframe);
                    return e.preventDefault();
                };
            });

            // Tinymce editable areas inside overlay
            $('textarea.mce_editable', overlay).each(function() {
                var id = $(this).attr('id'),
                    config = new TinyMCEConfig(id);
                // Forgive me for I am about to sin. But it does mean
                // we can overlay it multiple times. If you know a
                // better way, please share.
                delete InitializedTinyMCEInstances[id];
                config.init();
            });

            // Tabs ... TODO: use boostrap tabs

            // Cancel button
            // Modify common plone views so that Cancel button dismisses the
            // overlay
            var cancelbuttons = [
                'form.button.Cancel',
                'form.button.cancel',
                'form.actions.cancel'
                ];
            for (var idx in cancelbuttons) {
                $('input[name="' + cancelbuttons[idx] + '"]', overlay)
                    .on('click', function(e) {
                        overlay.modal('hide');
                        clear_template();
                        return e.preventDefault();
                    });
            }

            // Shrink iframe when the overlay is closed
            overlay.on('hidden', function(){ iframe.shrink(); });

            // Show overlay
            iframe.strech();
            overlay.modal('show');
        });
    }


    // # Trigger overlay
    $(document).ready(function() {
        $('body').append($(''+
            '<div class="modal" id="plone-overlay">' +
            '  <div class="modal-header">' +
            '    <a class="close" data-dismiss="modal">×</a>' +
            '    <h3>Title</h3>' +
            '  </div>' +
            '  <div class="modal-body">Content</div>' +
            '  <div class="modal-footer">' +
            '    <a href="#" class="btn">Cancel</a>' +
            '    <a href="#" class="btn btn-primary">Save changes</a>' +
            '  </div>' +
            '</div>'));
        $(document).bind('iframize_link_clicked', function(e, el, iframe) {
            overlay(el.attr('href'), iframe, el.parent().attr('id'));
            e.preventDefault();
        });
    });

}(jQuery));
