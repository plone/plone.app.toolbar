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
    // ... and so does selection of a content item
    $('#toolbar-button-plone-contentmenu-display #toolbar-button-contextSetDefaultPage a')
        .attr('target', null);

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
                // Shrink iframe when the overlay is closed
                modal.on('hidden', function(e){ toolbar.shrink(); });

                // Set up the overlay specifics
                overlay_setup(modal, body, menuid, href, selector);

                // Show overlay
                toolbar.stretch();
                modal.modal('show');
            }
        );
    }

    function overlay_setup(modal, body, menuid, href, selector){
        var cancelbuttons = ['form.button.Cancel',
            'form.button.cancel',
            'form.actions.cancel'];

        // Keep all links inside the overlay. Not sure if this should really
        // go AFTER the firing of overlay_setup.
        $('a', body).on('click', function(e){
            overlay($(e.target).attr('href'), menuid, selector);
            return e.preventDefault();
        });

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

            // Remove any parameters from the url
            var href = $(this).attr('href');
            var base_href = (href.match(/^([^?]+)/)||[])[1];

            if(href.match(/\/folder_contents$/)){
                var viewlink = $('<a><img src="++resource++plone.app.toolbar/view.png" /></a>')
                    .attr('href', $(this).attr('href').replace(/\/folder_contents$/, ''))
                    .attr('class', 'viewlink')
                    .attr('target', '_parent')
                    .attr('title', 'Open here'); // Needs i18n!
                $(this).parent().append(viewlink);
            } else if (base_href.match(/\/folder_contents$/)) {
                // It has parameters, leave it alone
            } else if (base_href.match(/\/folder_position$/)){
                // Do nothing, the default click handler already keeps
                // the result in the overlay
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

        // Fix breadcrumbs to go to folder_contents
        $('#toolbar-overlay #portal-breadcrumbs a').each(function(){
            $this = $(this);
            $this.attr('href', $this.attr('href') + '/folder_contents');
        });

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
