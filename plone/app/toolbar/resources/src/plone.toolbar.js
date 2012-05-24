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

$('body').on('click', function(e) { shrink(); });

$('body > .navbar a').on('click', function(e) {
  if (e.which === 1 || e.which === 2) {
    var el = $(e.target);

    // Buttons default to an overlay but if they
    // have the '_parent' link target, just load them in
    // the top window
    if (el.attr('target') === '_parent') {
      if (e.which === 1) {
        window.parent.location.href = el.attr('href');
      } else {
        window.parent.open(el.attr('href'));
      }

    } else {
      e.preventDefault();
      if (el.attr('data-toggle') === 'dropdown') {
        stretch();
      } else {
        console.log('CLICKED!!!');
        $(document).trigger('iframe_link_clicked', [el[0]]);
      }
    }
  }
});

}(jQuery));
