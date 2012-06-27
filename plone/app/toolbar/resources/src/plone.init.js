(function($) {

  $.plone = $.plone || {};

  $.plone.init = [];

  $.fn.ploneInit = function() {
    var self = this;
    $.each($.plone.init, function(i, callable) {
      callable.apply(self, [self]);
    });
  };

  // TODO: move this to tine_mce_init.js
  // initialization of TinyMCE
  $.plone.init.push(function(context) {
    $('textarea.mce_editable', context).each(function() {
      var el = $(this),
          id = Math.floor(Math.random() * 11) + '';
      $(el).attr('id', id);

      var config = new TinyMCEConfig(id);
      //delete InitializedTinyMCEInstances[id];
      config.init();

    });
  });

}(jQuery));
