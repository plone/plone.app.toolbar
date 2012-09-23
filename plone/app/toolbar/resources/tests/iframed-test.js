var TestCase = buster.testCase,
    assert = buster.assert;

// helper method that creates element which will get picked by iframed.js script
function createElement(name, example_name) {
  el = document.createElement("div");
  el.setAttribute('data-iframe', name);
  el.setAttribute('data-iframe-resources', example_name + '.css;' +
                                                example_name + '.js');
  el.innerHTML = '<p>' + example_name + ' content</p>';
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}


TestCase("iframed.js", {


  // create element which triggers iframe to be created
  setUp: function() {
    this.el = createElement('example', 'example');
  },

  // remove iframe and element which triggers iframe to be created
  tearDown: function() {
    var iframes = document.getElementsByTagName('iframe');
    for (var i=0; i < iframes.length; ) {
      iframes[i].parentNode.removeChild(iframes[i]);
    }
    this.el.parentNode.removeChild(this.el);
  },


  //  --- tests --- //

  "iframe with resources": function() {
    // initialize iframed script
    window.initialize_iframed();

    var iframe = document.getElementsByTagName('iframe')[0],
        iframe_document =  iframe.contentWindow.document;

    assert(document.getElementsByTagName('iframe').length === 1);
    assert(iframe_document.body.childNodes.length === 3);
    assert(iframe_document.getElementsByTagName('p').length === 1);
    assert(iframe_document.getElementsByTagName('p')[0].innerHTML === 'example content');

    var link = iframe_document.getElementsByTagName('link')[0];
    assert(iframe_document.getElementsByTagName('link').length === 1);
    assert(link.getAttribute('href') === 'example.css');
    assert(link.getAttribute('type') === 'text/css');
    assert(link.getAttribute('rel') === 'stylesheet');

    var script = iframe_document.getElementsByTagName('script')[0];
    assert(iframe_document.getElementsByTagName('script').length === 1);
    assert(script.getAttribute('src') === 'example.js');
    assert(script.getAttribute('type') === 'text/javascript');
  },

  "2 elements gets content into DIFFERENT iframe": function() {
    var el = createElement('example2', 'example2');

    // initialize iframed script
    window.initialize_iframed();

    assert(document.getElementsByTagName('iframe').length === 2);

    el.parentNode.removeChild(el);
  },

  "2 elements gets content into SAME iframe": function() {
    createElement('example', 'example2');

    // initialize iframed script
    window.initialize_iframed();

    assert(document.getElementsByTagName('iframe').length === 1);
  }

});
