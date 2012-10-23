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
/*global buster:false, jQuery:false, createIFrameReadyElement:false, onLoad:false */

(function($, undefined) {
"use strict";

var testCase = buster.testCase,
    assert = buster.assert;


testCase("iframe.js", {

  // create element which triggers iframe to be created
  setUp: function() {
    this.timeout = 1000;
    this.el = createIFrameReadyElement('example',
        'test/example-resource.js;test/example-resource.css',
        '<p>example content</p>');
  },

  // remove iframe and element which triggers iframe to be created
  tearDown: function() {
    $('iframe,[data-iframe]').remove();
  },


  //  --- tests --- //

  "check html of generated iframe": function(done) {
    window.iframe_initialize();
    return onLoad(done, window.iframe.example, function() {

      assert($('iframe').size() === 1);

      assert($('body').children().size() === 3);
      assert($('p').size() === 1);
      assert($('p').html() === 'example content');

      assert($('link').size() === 1);
      assert($('link').attr('href') === 'test/example-resource.css');
      assert($('link').attr('type') === 'text/css');
      assert($('link').attr('rel') === 'stylesheet');

      assert($('script').size() === 1);
      assert($('script').attr('src') === 'test/example-resource.js');
      assert($('script').attr('type') === 'text/javascript');

      var iframe = window.iframe.example;
      assert(iframe.attr('frameBorder') === '0');
      assert(iframe.attr('border') === '0');
      assert(iframe.attr('allowTransparency') === 'true');
      assert(iframe.attr('scrolling') === 'no');
      assert(iframe.attr('id') === 'example');
      assert(iframe.attr('name') === 'example');
      assert(iframe.css('height') !== '0px');

      assert(iframe.el === $('iframe'));

      // TODO: test updateOption method
      // TODO: test add method
    });
  }

  /*

  "height of empty iframe should be 0px": function(done) {
    var el = createIFrameReadyElement('example2', '', '');

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
    var el = createIFrameReadyElement('example3',
        'test/example-resource.js;test/example-resource.css',
            '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 2);

    el.parentNode.removeChild(el);
  },

  "2 elements gets content into SAME iframe": function() {
    var el = createIFrameReadyElement('example',
        'test/example-resource.js;test/example-resource.css',
            '<p>example content</p>');

    window.iframe_initialize();

    assert(document.getElementsByTagName('iframe').length === 1);

    el.parentNode.removeChild(el);
  },

  "Bottom-aligned iFrame does not add to height": function(done) {
    var el1 = createIFrameReadyElement('example_top',
        'test/example-resource.js;test/example-resource.css',
            "<p>I'm on top of the world!</p>",
            { 'alignment': 'top' });

    var el2 = createIFrameReadyElement('example_bottom',
        'test/example-resource.js;test/example-resource.css',
            "<p>I'm.......<br/><br/><br/>Not.</p>",
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
    var el1 = createIFrameReadyElement('example_pink', '',
            "<h1>I'm a pink title</h1>",
            { 'data-iframe-docstyles': 'h1 { background-color: pink; }' });

    window.iframe_initialize();

    var iframes = document.getElementsByTagName('iframe');

    function on_load() {
      if (window.iframe.example_pink.loaded === true) {

        assert(iframes.length === 2);
        assert(
            $('h1').css('background-color') !==
            $('h1', iframes.example_pink.contentWindow.document)
                .css('background-color'));

        el1.remove();

        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();
  },

  "extra attributes passed via url": function(done) {
    var el1 = createIFrameReadyElement('example2',
        'test/example-resource.js?data-main="example3"');

    window.iframe_initialize();

    var iframes = document.getElementsByTagName('iframe');

    function on_load() {
      if (window.iframe.example2.loaded === true) {

        assert(iframes.length === 2);
        console.log('test');

        el1.parentNode.removeChild(el1);

        done();
        return;
      }
      window.setTimeout(on_load, 23);
      return;
    }
    on_load();
  }
?*/
});

}(jQuery));
