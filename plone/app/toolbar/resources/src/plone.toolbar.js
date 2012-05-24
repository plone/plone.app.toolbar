(function($) {

$.iframe = $.iframe || {};

$.iframe.obj = window.parent.iframized[window.name],
    $.iframe.iframe_state;

$.iframe.shrink = function() {
  if ($.iframe.iframe_state !== undefined) {
    $($.iframe.obj.el).height($.iframe.iframe_state.height);
    $($.iframe.obj.el).offset($.iframe.iframe_state.offset);
    $.iframe.iframe_state = undefined;
  }
}

// stretch over whole parent document
$.iframe.stretch = function() {
  if ($.iframe.iframe_state === undefined) {
    $.iframe.iframe_state = {};
    $.iframe.iframe_state.height = $($.iframe.obj.el).height();
    $.iframe.iframe_state.offset = $($.iframe.obj.el).offset();
    $($.iframe.obj.el).height($(window.parent.document).height());
    $($.iframe.obj.el).offset({top: 0, left: 0});
  }
}

$(document).on('click', function(e) { $.iframe.shrink(); });

$('body > .navbar a').on('click', function(e) {
  if (e.which === 1 || e.which === 2) {
    var el = $(this),
        id = el.attr('id'),
        event_exists = false;
    e.preventDefault();

    if (id === undefined) {
      id = el.parents('[id]').attr('id');
    }

    if ($(document).data('events') !== undefined) {
      $.each($(document).data('events').plone_toolbar || [], function(i, e) {
        if (e.namespace === id) {
          event_exists = true;
          return;
        }
      });
    }

    if (el.attr('data-toggle') === 'dropdown') {
        $.iframe.stretch();

    // Buttons default to an overlay but if they
    // have the '_parent' link target, just load them in
    // the top window
    } else if (el.attr('target') === '_parent' || event_exists === false) {
      if (e.which === 1) {
        window.parent.location.href = el.attr('href');
      } else {
        window.parent.open(el.attr('href'));
      }

    } else {
      $(document).trigger('plone_toolbar.' + id, el);
    }
  }
});

}(jQuery));
