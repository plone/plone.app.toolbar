var TestCase = buster.testCase,
    assert = buster.assert;


TestCase("iframe stuff", {

  // create element which triggers iframe to be created
  setUp: function() {
    this.el = createElement('example',
        'test/example.js;test/example.css', '<p>example content</p>');
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

  "check html of generated iframe": function(done) {
    window.iframe_initialize();

    var iframe = document.getElementsByTagName('iframe')[0],
        iframe_document =  iframe.contentWindow.document;

    function on_load() {
      if (window.iframe.example.loaded === true) {
        assert(document.getElementsByTagName('iframe').length === 1);
        assert(iframe_document.body.childNodes.length === 3);
        assert(iframe_document.getElementsByTagName('p').length === 1);
        assert(iframe_document.getElementsByTagName('p')[0].innerHTML === 'example content');

        var link = iframe_document.getElementsByTagName('link')[0];
        assert(iframe_document.getElementsByTagName('link').length === 1);
        assert(link.getAttribute('href') === 'test/example.css');
        assert(link.getAttribute('type') === 'text/css');
        assert(link.getAttribute('rel') === 'stylesheet');

        var script = iframe_document.getElementsByTagName('script')[0];
        assert(iframe_document.getElementsByTagName('script').length === 1);
        assert(script.getAttribute('src') === 'test/example.js');
        assert(script.getAttribute('type') === 'text/javascript');

        assert(iframe.getAttribute('frameBorder') === '0');
        assert(iframe.getAttribute('border') === '0');
        assert(iframe.getAttribute('allowTransparency') === 'true');
        assert(iframe.getAttribute('scrolling') === 'no');
        assert(iframe.getAttribute('id') === 'example');
        assert(iframe.getAttribute('name') === 'example');
        assert(iframe.getAttribute('style').indexOf('height:0px') === -1);

        assert(window.iframe.example.el === iframe);

        // TODO: test updateOption method
        // TODO: test add method

        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();

  },

  "height of empty iframe should be 0px": function(done) {
    var el = createElement('example2', '', '');

    window.iframe_initialize();

    var iframe = document.getElementsByName('example2')[0];

    function on_load() {
      if (window.iframe.example2.loaded === true) {
        assert(iframe.getAttribute('style').indexOf('height:0px') !== -1);
        el.parentNode.removeChild(el);
        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();
  },

  "2 elements gets content into DIFFERENT iframe": function() {
    var el = createElement('example3',
        'test/example.js;test/example.css', '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 2);

    el.parentNode.removeChild(el);
  },

  "2 elements gets content into SAME iframe": function() {
    var el = createElement('example',
        'test/example.js;test/example.css', '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 1);

    el.parentNode.removeChild(el);
  },

  "Bottom-aligned iFrame does not add to height": function() {
    var el1 = createElement('example_top',
        'test/example.js;test/example.css', "<p>I'm on top of the world!</p>",
        { 'alignment': 'top' });

    var el2 = createElement('example_bottom',
        'test/example.js;test/example.css', "<p>I'm.......<br/><br/><br/>Not.</p>",
        { 'alignment': 'bottom' });

    window.iframe_initialize();

    iframes = document.getElementsByTagName('iframe');
    assert(iframes.length === 3);
    assert(iframes.example_top.offsetHeight < iframes.example_bottom.offsetHeight);
    assert(iframes.example_top.offsetHeight + 'px' === document.body.style.marginTop);

    el.parentNode.removeChild(el1);
    el.parentNode.removeChild(el2);
  },

  "CSS Styles only apply to inner document": function() {
    var el1 = createElement('example_pink',
        'test/example.js;test/example.css', "<h1>I'm a pink title</h1>",
        { 'docstyles': 'h1 { background-color: pink; }' });

    window.iframe_initialize();

    iframes = document.getElementsByTagName('iframe');
    assert(iframes.length === 2);
    iframe_h1_color = getStyle(iframes.example_pink.contentWindow.document.getElementsByTagName('h1')[0],'background-color');
    doc_h1_color = getStyle(document.getElementsByTagName('h1')[0],'background-color');
    assert(iframe_h1_color !== doc_h1_color);

    el.parentNode.removeChild(el1);
  }

});
