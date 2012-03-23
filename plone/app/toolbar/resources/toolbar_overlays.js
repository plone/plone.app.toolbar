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

    function overlay(href) {
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);

        if(href === undefined){
            return;
        }

        // Clean up the url
        href = (href.match(/^([^#]+)/)||[])[1];

        // Insert ++untheme++ namespace to disable theming. This only works
        // for absolute urls.
        var unthemed = href.replace(/^(https?:\/\/[^/]+)\/(.*)/, '$1/++untheme++d/$2')

        body.empty().load(unthemed + ' #portal-column-content > *',
            function(response, error){

                // Keep all links inside the overlay (except for
                // the folder_contents overlay)
                $('a', body).on('click', function(e){
                    overlay($(e.target).attr('href'));
                    return e.preventDefault();
                });

                // TODO These things needs to be in some kind of add-on file
                // that is loaded only for folder_contents.
                // Override default behaviour on folder_contents links
                $('#folderlisting-main-table a', body).each(function(){
                    if($(this).attr('href').slice(-16) == '/folder_contents') {
                        var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                            .attr('href', $(this).attr('href'))
                            .attr('class', 'viewlink')
                            .attr('target', '_parent')
                            .attr('title', 'Open here'); // Needs i18n!
                        $(this).parent().append(viewlink);
                    } else {
                        $(this).on('click', function(e){
                           window.parent.location.href = $(e.target).attr('href');
                        });
                    }
                });

                // Add an "Open here" link at the top
                $('#folderlisting-main-table', body).parents('#content').each(function(){
                    var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                        .attr('href', href)
                        .attr('class', 'viewlink')
                        .attr('target', '_parent')
                        .attr('title', 'Open here'); // Needs i18n!
                    $('h1.documentFirstHeading', this).append(viewlink);
                });

                // Forms are posted to the parent window.
                $('form', body).attr('target', '_parent');

                // Call any other event handlers
                ev = $.Event();
                ev.type='afterSetupOverlay';
                toolbar.el.trigger(ev);

                // Shrink iframe when the overlay is closed
                modal.on('hidden', function(e){ toolbar.shrink(); });

                // Show overlay
                toolbar.stretch();
                modal.modal('show');
            }
        );
    }

    // Overlay when event is passed
    toolbar.el.on('setup_overlay', function(e, href){
        overlay(href);
        return e.preventDefault();
    });

    toolbar.el.on('afterSetupOverlay', function(e){
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal),
            cancelbuttons = ['form.button.Cancel',
                'form.button.cancel',
                'form.actions.cancel'];

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

    });

});
