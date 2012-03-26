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

            // Keep all links inside the overlay. Not sure if this should really
            // go AFTER the firing of overlay_setup.
            $('a', body).on('click', function(e){
                overlay($(e.target).attr('href'), menuid, selector);
                return e.preventDefault();
            });

            // Call any other event handlers
            $(document).trigger('overlay_setup.' + action_id, href);

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

        // TODO: this should be already in html. if its not possible hack it
        // into toolbar.py
        //
        // ... but rename goes in an overlay
        $('#toolbar-button-plone-contentmenu-actions #toolbar-button-rename a')
            .attr('target', null);
        // ... and so does selection of a content item
        $('#toolbar-button-plone-contentmenu-display #toolbar-button-contextSetDefaultPage a')
            .attr('target', null);
        // END:TODO

        var _window = window;
        if (window.parent !== window) {
            _window = window.parent;
        }
        _window.$(_window.document).bind('iframe_link_clicked', function(e, el, iframe) {
            overlay(el.attr('href'), iframe, el.parent().attr('id'));
        });

    });

    // Namespaced event that only fires for folder_contents
    $(document).on('overlay_setup.toolbar-button-folderContents', function(e){
        $('#folderlisting-main-table a').each(function(){

            // Remove any parameters from the url
            var href = $(this).attr('href');
            var base_href = (href.match(/^([^?]+)/)||[])[1];

            if(base_href.match(/\/folder_contents$/)){
                var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                    .attr('href', $(this).attr('href').replace(/\/folder_contents$/, ''))
                    .attr('class', 'viewlink')
                    .attr('target', '_parent')
                    .attr('title', 'Open here'); // Needs i18n!
                $(this).parent().append(viewlink);
            } else if (base_href.match(/\/folder_position$/)){
                // Do nothing, the default click handler already keeps
                // the result in the overlay
            } else if (base_href.match(/\/folder_contents$/)) {
                // It has parameters, leave it alone
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
            .attr('href', e.href.replace(/\/folder_contents$/, ''))
            .attr('class', 'viewlink')
            .attr('target', '_parent')
            .attr('title', 'Open here'); // Needs i18n!
        $('h1.documentFirstHeading').append(viewlink);


        // Keep forms inside the overlay by placing result of form submission
        // back into the overlay and calling overlay_setup again.
        $('form').ajaxForm({
            success: function (responseText){
                var modal = $('#toolbar-overlay'),
                    body = $('.modal-body', modal),
                    selector = '#portal-column-content > *';
                // strip inline script tags
                responseText = responseText.replace(/<script(.|\s)*?\/script>/gi, "");
                var res = $('<div />').append(responseText)
                    .find(selector);
                body.empty().append(res);
                overlay_setup(modal, body, 'toolbar-button-folderContents', e.href, selector);
                return false;
            }
        });

        // Fix breadcrumbs to go to folder_contents
        $('#toolbar-overlay #portal-breadcrumbs a').each(function(){
            $this = $(this);
            $this.attr('href', $this.attr('href') + '/folder_contents');
        });

    });

    // Namespaced event that only fires when adding content
    $(document).on('overlay_setup.toolbar-button-plone-contentmenu-factories', function(e){
        // Submit form using ajax, then close modal and reload parent
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);
        $('form', body).ajaxForm({
            success: function() {
                modal.modal('hide');
                body.empty();
                window.parent.location.replace(window.parent.location.href);
            }
        });
     });


}(jQuery));
