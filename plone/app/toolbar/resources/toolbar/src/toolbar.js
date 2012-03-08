$(document).ready(function() {
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
});
