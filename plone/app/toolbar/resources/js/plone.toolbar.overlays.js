/******
    Set up standard Plone popups
    
    Extends jQuery.tools.overlay.conf to set up common Plone effects and
    visuals.
******/



jQuery.extend(jQuery.tools.overlay.conf, {
    fixed: false,
    speed: 'fast',
    mask: {
        color:'#fff',
        opacity: 0.4,
        loadSpeed:0,
        closeSpeed:0
    }
});

// Override p.a.jquerytool's create_content_div method (in overlayhelpers.js)
// to create a bootstrap compatible overlay container
pb.create_content_div = function (pbo, trigger) {

    var pbw = pbo.width,
        content = $('' +
            '<div id="' + pbo.nt + '"' +
            '     class="modal overlay-' + pbo.subtype +
                    ' ' + (pbo.cssclass || '') + '">' +
            ' <div class="modal-header">' +
            '  <div class="close">' +
            '   <span>Close</span>' +
            '  </div>' +
            '  <h3>Title</h3>' +
            ' </div>' +
            ' <div class="modal-body pb-ajax">' +
            ' </div>' +
            '</div>');

    content.data('pbo', pbo);

    // if a width option is specified, set it on the overlay div,
    // computing against the window width if a % was specified.
    if (pbw) {
        if (pbw.indexOf('%') > 0) {
            content.width(parseInt(pbw, 10) / 100 * $(window).width());
        } else {
            content.width(pbw);
        }
    }

    // add the target element at the end of the body.
    if (trigger) {
        trigger.after(content);
    } else {
        content.appendTo($("body"));
    }

    content.bind('click', {pbo: pbo}, function(event) {
        event.preventDefault();
    });

    return content;

};


(function($) {

    if (jQuery.browser.msie && parseInt(jQuery.browser.version, 10) < 7) {
        // it's not realistic to think we can deal with all the bugs
        // of IE 6 and lower. Fortunately, all this is just progressive
        // enhancement.
        return;
    }

    var common_content_filter = '#content>*:not(div.configlet),dl.portalMessage.error,dl.portalMessage.info';

    // method to show error message in a noform
    // situation.
    function noformerrorshow(el, noform) {
        var o = $(el),
            emsg = o.find('dl.portalMessage.error');
        if (emsg.length) {
            o.children().replaceWith(emsg);
            return false;
        } else {
            return noform;
        }
    }

    // After deletes we need to redirect to the target page.
    function redirectbasehref(el, responseText) {
        var mo = responseText.match(/<base href="(\S+?)"/i);
        if (mo.length === 2) {
            return mo[1];
        }
        return location;
    }

    // display: select content item / change content item
    $('#toolbar-button-folderChangeDefaultPage > a').prepOverlay({
        subtype: 'ajax',
        filter: common_content_filter,
        formselector: 'form[name="default_page_form"]',
        noform: function(el) { return noformerrorshow(el, 'reload'); },
        closeselector: '[name=form.button.Cancel]',
        width:'40%'
    });

    // TODO: Advanced state
    // This form needs additional JS and CSS for the calendar widget.
    // The AJAX form doesn't load it from the javascript_head_slot.
    // $('#toolbar-button-advanced > a').prepOverlay({
    //     subtype: 'ajax',
    //     filter: common_content_filter,
    //     formselector: 'form',
    //     noform: function(el) { return noformerrorshow(el, 'reload'); },
    //     closeselector: '[name=form.button.Cancel]'
    // });

    // Delete dialog
    $('#toolbar-button-delete > a').prepOverlay({
        subtype: 'ajax',
        filter: common_content_filter,
        formselector: '#delete_confirmation',
        noform: function(el) { return noformerrorshow(el, 'redirect'); },
        redirect: redirectbasehref,
        closeselector: '[name=form.button.Cancel]',
        width:'50%'
    });

    // Rename dialog
    $('#toolbar-button-rename > a').prepOverlay({
        subtype: 'ajax',
        filter: common_content_filter,
        closeselector: '[name=form.button.Cancel]',
        width:'40%'
    });

})(jQuery);
