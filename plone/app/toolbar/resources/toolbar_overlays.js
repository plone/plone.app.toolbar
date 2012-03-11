// Define common overlay behaviour for common plone views, you can write
// your own versions of these to get custom behaviour for your overlay.

$(document).ready(function() {

    // Modify common plone views so that Cancel button dismisses the overlay
    $(document).on('afterSetupOverlay', function(e){
        var modal = $(e.target),
            body = $('.modal-body', modal),
            cancelbuttons = ['form.button.Cancel',
                'form.button.cancel',
                'form.actions.cancel'];

        // Cancel should close the overlay
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
