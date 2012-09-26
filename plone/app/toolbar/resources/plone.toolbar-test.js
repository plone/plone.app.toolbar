var TestCase = buster.testCase,
    assert = buster.assert;

TestCase("plone.toolbar.js", {

  // create element which triggers iframe to be created
  setUp: function() {
    this.el = createElement('toolbar-example',
      '../lib/jquery-1.7.2.min.js;../src/plone.toolbar.js',
      '<p>toolbar example content</p>');
  },

  // remove iframe and element which triggers iframe to be created
  tearDown: function() {
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; frames.length !== 0; ) {
      iframes[i].parentNode.removeChild(iframes[i]);
    }
    this.el.parentNode.removeChild(this.el);
  },


  //  --- tests --- //

  "stretch and shrink iframe": function() {
    window.iframe_initialize();

    var iframe = window.parent.iframe['toolbar-example'],
        iframe_window = document.getElementsByTagName('iframe')[0].contentWindow,
        iframe_document = iframe_window.document,
        $ = iframe_window.$;


    console.log('test');
  }

});
