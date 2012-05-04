(function($) {

  $.plone = $.plone || {};

  $.plone.init = [];

  $.fn.ploneInit = function() {
    var self = this;
    $.each($.plone.init, function(i, callable) {
      callable.apply(self, [self]);
    });
  };

}(jQuery));
