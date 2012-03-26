(function($) {
    "use strict";


    // # Namespace {{{
    $.plone = $.plone || {};
    // }}}

    // # Defaults {{{
    $.plone.overlay_mapping = $.extend(true, {
        'default': {
            'h1.documentFirstHeading': '.modal-header h3',
            'div:has(> form#document-base-edit)': '.modal-body'
        }
    }, $.plone.overlay_mapping || {});
    // }}}

    // 
    function overlay(href, iframe, action_id) {
        var overlay = $('#plone-overlay'),
            overlay_mapping = $.plone.overlay_mapping['default'];

        overlay.on('click', function(e) {
            e.stopPropagation();
        });

        if (action_id !== undefined && $.plone.overlay_mapping[action_id] !== undefined) {
            overlay_mapping = $.extend({}, overlay_mapping,
                    $.plone.overlay_mapping[action_id]);
        }

        // Clean up the url
        href = (href.match(/^([^#]+)/)||[])[1];

        // TODO: show spinner before starting a request

        // Insert ++untheme++ namespace to disable theming. This only works
        // for absolute urls.
        $.get(href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2'),
                function(data) {

            data = $('<div/>').html(data);
            $.each(overlay_mapping, function(source, target) {
                $(target, overlay).html(data.find(source).html());
            });

            var body = $('.modal-body', overlay);

            // Keep all links inside the overlay
            $('a', body).on('click', function(e){
                overlay($(e.target).attr('href'), iframe);
                return e.preventDefault();
            });

            // All forms are posted to the parent window.
            $('form', body).attr('target', '_parent');

            // Things restricted to folder_contents.
            if (action_id === 'toolbar-button-folderContents') {
                // Override default behaviour on folder_contents links
                $('#folderlisting-main-table a', body).each(function() {
                    if($(this).attr('href').slice(-16) === '/folder_contents') {
                        var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                            .attr('href', $(this).attr('href'))
                            .attr('class', 'viewlink')
                            .attr('target', '_parent')
                            .attr('title', 'Open here'); // Needs i18n!
                        $(this).parent().append(viewlink);
                    } else {
                        // Replace click handler
                        $(this).off('click');
                        $(this).on('click', function(e){
                            window.parent.location.href = $(e.target).attr('href');
                        });
                    }
                });

                // Add an "Open here" link at the top
                var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                    .attr('href', href)
                    .attr('class', 'viewlink')
                    .attr('target', '_parent')
                    .attr('title', 'Open here'); // Needs i18n!
                $('h1.documentFirstHeading').append(viewlink);

            } else if (action_id === 'toolbar-button-plone-contentmenu-factories'){
                // Submit form using ajax, then close modal and reload parent
                $('form', body).ajaxForm({
                    success: function() {
                        overlay.modal('hide');
                        body.empty();
                        window.parent.location.replace(window.parent.location.href);
                    }
                });
            }

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

            // Form buttons ... TODO: copy form buttons into modal-footer

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
            overlay.on('hidden', function() { iframe.shrink(); });

            // Call any other event handlers
            $(iframe.document).trigger('on_overlay_setup', action_id);

            // Show overlay
            iframe.stretch();
            // TODO: hide spinner
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
            '</div>').hide());

        // Links under "Display", "Workflow", etc should open directly in parent
        var no_overlay = [
            "#toolbar-button-plone-contentmenu-workflow",
            "#toolbar-button-plone-contentmenu-display",
            "#toolbar-button-plone-contentmenu-actions"
            ];

        for(var idx in no_overlay){
            $(no_overlay[idx] + " a").attr('target', '_parent');
        }

        // ... but rename goes in an overlay
        $('#toolbar-button-plone-contentmenu-actions #toolbar-button-rename a')
            .attr('target', null);

        var _window = window;
        if (window.parent !== window) {
            _window = window.parent;
        }
        _window.$(_window.document).bind('iframe_link_clicked', function(e, el, iframe) {
            overlay(el.attr('href'), iframe, el.parent().attr('id'));
        });

    });

}(jQuery));
