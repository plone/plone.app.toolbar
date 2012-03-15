// Define common overlay behaviour for common plone views, you can write
// your own versions of these to get custom behaviour for your overlay.

window.parent.toolbar.el.on('toolbar_loaded',
        {toolbar: window.parent.toolbar}, function(event) {

    var toolbar = event.data.toolbar;

    function overlay(href) {
        var modal = $('#toolbar-overlay', toolbar.document),
            body = $('.modal-body', modal);

        if(href === undefined){
            return;
        }

        // Clean up the url, set toolbar skin
        href = (href.match(/^([^#]+)/)||[])[1];

        body.empty().load(href + ' #portal-column-content > *',
            function(response, error){

                // Keep all links inside the overlay (except for
                // the folder_contents overlay)
                $('a', body).on('click', function(e){
                    console.log($('#folderlisting-main-table', body).length);
                    if ($('#folderlisting-main-table', body).length) {
                        if ($(e.target).attr('href').slice(-16) == '/folder_contents') {
                            overlay($(e.target).attr('href'));
                            return e.preventDefault();
                        } else {
                            window.parent.location.href = $(e.target).attr('href');
                        };
                    } else {
                        overlay($(e.target).attr('href'));
                        return e.preventDefault();
                    };
                });

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
