// Define common overlay behaviour for common plone views, you can write
// your own versions of these to get custom behaviour for your overlay.

window.parent.toolbar.el.on('toolbar_loaded',
        {toolbar: window.parent.toolbar}, function(event) {

    var toolbar = event.data.toolbar;

    // Links under "Display", "Workflow", etc should open directly in parent
    no_overlay = [
        "#toolbar-button-plone-contentmenu-workflow",
        "#toolbar-button-plone-contentmenu-display",
        "#toolbar-button-plone-contentmenu-actions"];
    for(var idx in no_overlay){
        $(no_overlay[idx] + " a").attr('target', '_parent');
    }
    // ... but rename goes in an overlay
    $('#toolbar-button-plone-contentmenu-actions #toolbar-button-rename a')
        .attr('target', null);

    // Manage Portlets gets a different selector
    $('#manage_portlets a').attr('data-overlay-selector', '#portal-columns');

    function overlay(href, menuid, selector) {
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);

        if(href === undefined){
            return;
        }

        // What part of the result to overlay
        selector = selector || "#portal-column-content > *";

        // Clean up the url
        href = (href.match(/^([^#]+)/)||[])[1];

        // Insert ++untheme++ namespace to disable theming. This only works
        // for absolute urls.
        var unthemed = href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2')

        body.empty().load(unthemed + ' ' + selector,
            function(response, error){

                // Keep all links inside the overlay
                $('a', body).on('click', function(e){
                    overlay($(e.target).attr('href'), menuid, selector);
                    return e.preventDefault();
                });

                // All forms are posted to the parent window.
                $('form', body).attr('target', '_parent');

                // Shrink iframe when the overlay is closed
                modal.on('hidden', function(e){ toolbar.shrink(); });

                // Set up the overlay specifics
                overlay_setup(modal, body, menuid, href);

                // Show overlay
                toolbar.stretch();
                modal.modal('show');
            }
        );
    }

    function overlay_setup(modal, body, menuid, href){
        var cancelbuttons = ['form.button.Cancel',
            'form.button.cancel',
            'form.actions.cancel'];

        // Fire a namespaced event for this overlay
        ev = $.Event();
        ev.type='overlay_setup.' + menuid;
        ev.href = href;
        toolbar.el.trigger(ev);

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

        // Modify common plone views so that Cancel button dismisses the
        // overlay
        for (var idx in cancelbuttons){
            $('input[name="' + cancelbuttons[idx] + '"]', body)
            .on('click', function(ev){
                modal.modal('hide');
                body.empty();
                return ev.preventDefault();
            });
        }

    }

    // Handle the load_overlay event from the main window
    toolbar.el.on('load_overlay', function(e, el){
        var trigger = $(el),
            menuid = trigger.parents('li.toolbar-button').map(function(idx, el){
                return $(el).attr('id');
            }).last()[0];

        // allow a different selector to be passed in the data-overlay-selector
        // html5 attribute
        var selector=trigger.data('overlaySelector');
        overlay(trigger.attr('href'), menuid, selector);
        return e.preventDefault();
    });

    // Namespaced event that only fires for folder_contents
    toolbar.el.on('overlay_setup.toolbar-button-folderContents', function(e){
        $('#folderlisting-main-table a').each(function(){
            if($(this).attr('href').slice(-16) == '/folder_contents') {
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
            .attr('href', e.href)
            .attr('class', 'viewlink')
            .attr('target', '_parent')
            .attr('title', 'Open here'); // Needs i18n!
        $('h1.documentFirstHeading').append(viewlink);
    });

    // Namespaced event that only fires when adding content
    toolbar.el.on('overlay_setup.toolbar-button-plone-contentmenu-factories', function(e){
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

});
