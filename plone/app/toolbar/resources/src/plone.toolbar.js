(function($) {

var iframe = parent.window.iframized[window.name],
    iframe_state;

function shrink() {
  if (iframe_state !== undefined) {
    $(iframe.el).height(iframe_state.height);
    $(iframe.el).offset(iframe_state.offset);
    iframe_state = undefined;
  }
}

// stretch over whole parent document
function stretch() {
  if (iframe_state === undefined) {
    iframe_state = {};
    iframe_state.height = $(iframe.el).height();
    iframe_state.offset = $(iframe.el).offset();
    $(iframe.el).height($(window.parent.document).height());
    $(iframe.el).offset({top: 0, left: 0});
  }
}

$(document).on('click', function(e) { shrink(); });

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
        stretch();

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
