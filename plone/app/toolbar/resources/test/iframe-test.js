// tests for iframe.js script.
//
// @author Rok Garbas
// @version 1.0
// @licstart  The following is the entire license notice for the JavaScript
//            code in this page.
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// @licend  The above is the entire license notice for the JavaScript code in
//          this page.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  regexp:true, undef:true, strict:true, trailing:true, browser:true */
/*global buster:false, createElement:false, getStyle:false */

(function(undefined) {
"use strict";

var testCase = buster.testCase,
    assert = buster.assert;


testCase("iframe stuff", {

  // create element which triggers iframe to be created
  setUp: function() {
    this.el = createElement('example',
        'test/resources/examples.js;test/resources/example.css', '<p>example content</p>');
  },

  // remove iframe and element which triggers iframe to be created
  tearDown: function() {
    var iframes = document.getElementsByTagName('iframe');
    var i;

    for (i = 0; iframes.length !== 0; ) {
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
        assert(link.getAttribute('href') === 'test/resources/example.css');
        assert(link.getAttribute('type') === 'text/css');
        assert(link.getAttribute('rel') === 'stylesheet');

        var script = iframe_document.getElementsByTagName('script')[0];
        assert(iframe_document.getElementsByTagName('script').length === 1);
        assert(script.getAttribute('src') === 'test/resources/examples.js');
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
        'test/resources/examples.js;test/resources/example.css', '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 2);

    el.parentNode.removeChild(el);
  },

  "2 elements gets content into SAME iframe": function() {
    var el = createElement('example',
        'test/resources/examples.js;test/resources/example.css', '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 1);

    el.parentNode.removeChild(el);
  },

  "Bottom-aligned iFrame does not add to height": function(done) {
    var el1 = createElement('example_top',
        'test/resources/examples.js;test/resources/example.css', "<p>I'm on top of the world!</p>",
        { 'alignment': 'top' });

    var el2 = createElement('example_bottom',
        'test/resources/examples.js;test/resources/example.css', "<p>I'm.......<br/><br/><br/>Not.</p>",
        { 'alignment': 'bottom' });

    window.iframe_initialize();

    var iframes = document.getElementsByTagName('iframe');

    function on_load() {
      if (window.iframe.example_top.loaded === true &&
          window.iframe.example_bottom.loaded === true) {

        assert(iframes.length === 3);
        assert(iframes.example_top.offsetHeight < iframes.example_bottom.offsetHeight);
        assert(iframes.example_top.offsetHeight + 'px' === document.body.style.marginTop);

        el1.parentNode.removeChild(el1);
        el2.parentNode.removeChild(el2);

        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();
  },

  "CSS Styles only apply to inner document": function(done) {
    var el1 = createElement('example_pink',
        'test/resources/examples.js;test/resources/example.css', "<h1>I'm a pink title</h1>",
        { 'docstyles': 'h1 { background-color: pink; }' });

    window.iframe_initialize();

    var iframes = document.getElementsByTagName('iframe');

    function on_load() {
      if (window.iframe.example_pink.loaded === true) {

        assert(iframes.length === 2);
        var iframe_h1_color = getStyle(
            iframes.example_pink.contentwindow.document.getelementsbytagname('h1')[0],
            'background-color');
        var doc_h1_color = getStyle(
            document.getelementsbytagname('h1')[0],
            'background-color');
        assert(iframe_h1_color !== doc_h1_color);

        el1.parentnode.removechild(el1);

        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();
  }

});

}());
