// tests for plone.overlay.js script.
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
/*global buster:false, jQuery:false, */

(function($, undefined) {
"use strict";

var testCase = buster.testCase,
    assert = buster.assert;


testCase("plone.overlay.js", {

  setUp: function() {
    var self = this;
    self._formButtons = $.fn.ploneOverlay.defaults.formButtons;
    self._modalTemplate = $.fn.ploneOverlay.defaults.modalTemplate;
    self._addPrefixToURL = $.fn.ploneOverlay.defaults.addPrefixToURL;
    self._defaultFormButtonOptions = $.fn.ploneOverlay.defaultFormButtonOptions;

    $.fn.ploneOverlay.defaults.formButtons = {
      '.modal-body input[name="form.button.Save"]': $.fn.ploneOverlay.defaultFormButton
    };
    $.fn.ploneOverlay.defaults.modalTemplate = function(content) {
      return self._modalTemplate.apply(this, [ content, { title: 'h1', body: '#content' } ]);
    };
    $.fn.ploneOverlay.defaults.addPrefixToURL = function(url) { return url; };
    $.fn.ploneOverlay.defaultFormButtonOptions.responseFilter = '#wrapper';

    if ($.iframe) {
      $.iframe.document = document;
      $.iframe.window = window;
    }
  },

  tearDown: function() {
    var self = this;
    $('.modal').remove();
    $('#wrapper').remove();
    $.fn.ploneOverlay.defaults.formButtons = self._formButtons;
    $.fn.ploneOverlay.defaults.modalTemplate = self._modalTemplate;
    $.fn.ploneOverlay.defaults.addPrefixToURL = self._addPrefixToURL;
    $.fn.ploneOverlay.defaultFormButtonOptions = self._defaultFormButtonOptions;
    $.plone.init._items = [];
    if ($.iframe) {
      $.iframe.el.remove();
      $.iframe = undefined;
    }
  },

  //  --- tests --- //

  "append overlay element to body if its not part of DOM yet": function() {
    var el = $('<div><h1>Example Title</h1><div id="content">Example Body</div></div>'),
        onInit = this.stub(),
        onShow = this.stub(),
        onHide = this.stub(),
        onDestroy = this.stub();

    el.ploneOverlay({
      onInit: onInit,
      onShow: onShow,
      onHide: onHide,
      onDestroy: onDestroy
    });

    var overlay = el.data('plone-overlay');

    assert(overlay.el.parents('body').size() === 1);
    assert(overlay.el.css('display') === 'none');

    assert($('.modal-body', overlay.el).html() === 'Example Body');
    assert($('.modal-header > h3', overlay.el).html() === 'Example Title');
    assert($('.modal')[0] === overlay.el[0]);

    el.ploneOverlay('show');

    assert(overlay.el.parents('body').size() === 1);
    assert(overlay.el.css('display') === 'block');

    el.ploneOverlay('hide');

    assert(overlay.el.parents('body').size() === 1);
    assert(overlay.el.css('display') === 'none');

    assert.calledOnce(onHide);

    el.ploneOverlay('destroy');

    assert(overlay.el.parents('body').size() === 0);

    // twice because 'destroy' will reinitialize overlay
    assert.calledTwice(onInit);
    assert.calledOnce(onShow);
    // twice because hide is called again on destroy
    assert.calledTwice(onHide);
    assert.calledOnce(onDestroy);
    assert.callOrder(onInit, onShow, onHide, onDestroy);
  },

  "custom creation of modal": function() {
    var el = $('<a/>'),
        modal = $('<div class="modal">Example Modal</div>');

    el.ploneOverlay({
      show: true,
      el: function(callback) { this.el = modal; callback.call(this); }
    });

    var overlay = el.data('plone-overlay');

    assert(overlay.el[0] === modal[0]);
  },

  "clicking on any modal element should be disabled": function() {
    var el = $('<div><h1>Example Title</h1><div id="content"><a ' +
        'class="allowDefault" href="http://example.com">Example Body</a>' +
        '</div></div>');

    el.ploneOverlay('show');
    var overlay = el.data('plone-overlay');

    assert(overlay.el.parents('body').size() === 1);
    $('[data-dismiss="modal"]', overlay.el).trigger('click');
    assert(overlay.el.parents('body').size() === 0);

    el = el.clone();
    el.ploneOverlay('show');
    overlay = el.data('plone-overlay');

    assert(overlay.el.css('display') === 'block');
    assert(overlay.el.parents('body').size() === 1);
    $('h1', overlay.el).trigger('click');

    assert(overlay.el.css('display') === 'block');
    assert(overlay.el.parents('body').size() === 1);

    $('.modal-body > a', overlay.el).trigger('click');
    assert(window.location !== 'http://example.com');
  },

  "loading modal html from remote url": function(done) {
    var el = $('<div><h1>Example Title</h1><div id="content">Example Body</div></div>'),
        onBeforeLoad = this.stub(),
        onLoaded = this.stub();

    el.ploneOverlay({
      show: true,
      el: 'test/example-resource.html#wrapper',
      onBeforeLoad: onBeforeLoad,
      onLoaded: onLoaded,
      onInit: function() {
        var self = this;
        assert.calledOnce(onBeforeLoad);
        assert.calledOnce(onLoaded);
        assert.callOrder(onBeforeLoad, onLoaded);
        assert($('h3', self.el).html() === 'Example Resource Title');
        assert($('.modal-body', self.el).html() === 'Example Resource Content');
        done();
      }
    });
  },

  "submitting forms via ajax": function(done) {
    var el = $('' +
          '<div>' +
          ' <h1>Example Title</h1>' +
          ' <div id="content">' +
          '  <form action="test/example-resource.html" method="get">' +
          '    <input type="text" value="Example Ajax" />' +
          '    <input type="input" name="form.button.Save" value="Save" />' +
          '  </form>' +
          ' </div>' +
          '</div>');

    el.ploneOverlay({
      show: true,
      onAjaxSave: function(responseBody) {
        assert($('h1', responseBody).html() === 'Example Resource Title');
        assert($('#content', responseBody).html() === 'Example Resource Content');
        done();
      },
      onShow: function() {
        $('.modal-footer input[name="form.button.Save"]', this.el).trigger('click');
      }
    });
  },

  "handling error when submitting forms via ajax": function(done) {
    var el = $('' +
          '<div>' +
          ' <h1>Example Title</h1>' +
          ' <div id="content">' +
          '  <form action="test/example-resource-errorform.html" method="get">' +
          '    <input type="text" value="Example Ajax" />' +
          '    <input type="input" name="form.button.Save" value="Save" />' +
          '  </form>' +
          ' </div>' +
          '</div>');

    el.ploneOverlay({
      show: true,
      onAjaxError: function() {
        var self = this;
        assert($('h3', self.el).html() === 'Example Error Form Title');
        assert($('input[type="text"]', self.el).val() === 'Example Error Ajax');
        done();
      },
      onShow: function() {
        $('.modal-footer input[name="form.button.Save"]', this.el).trigger('click');
      }
    });
  },

  "handling of response on successfull ajaxSubmit": function(done) {
    var el = $('' +
          '<div>' +
          ' <h1>Example Title</h1>' +
          ' <div id="content">' +
          '  <form action="test/example-resource.html" method="get">' +
          '    <input type="text" value="Example Ajax" />' +
          '    <input type="input" name="form.button.Save" value="Save" />' +
          '  </form>' +
          ' </div>' +
          '</div>'),
        el2 = $('<div id="wrapper">Something</div>').appendTo('body');

    el.ploneOverlay({
      show: true,
      onShow: function() {
        var self = this,
            oldSuccess = self._formButtons['.modal-body input[name="form.button.Save"]'].success;
        function newSuccess(response, state, xhr, form) {
          oldSuccess(response, state, xhr, form);
          assert($('#wrapper').html() !== 'Something');
          done();
        }
        self._formButtons['.modal-body input[name="form.button.Save"]'].success = newSuccess;
        $('.modal-footer input[name="form.button.Save"]', this.el).trigger('click');
      }
    });
  },

  "addPrefixToURL conversion": function() {
    assert(this._addPrefixToURL('http://example.com/something', 'prefix') ===
        'http://example.com/prefix/something');
    assert(this._addPrefixToURL('/something', 'prefix').substr(-17, 17) ===
        '/prefix/something');
    assert(this._addPrefixToURL('something', 'prefix').substr(-17, 17) !==
        '/prefix/something');
    assert(this._addPrefixToURL('something', 'prefix').substr(-10, 10) === '/something');
    assert(this._addPrefixToURL('something', 'prefix').indexOf('prefix') !== -1);
  },

  "jquery.iframe.js integration": function() {
    $.iframe = new $.IFrame({
      el: $('<div><p>some</p><a href="#">some link</a></div>').appendTo('body'),
      position: 'top'
    });

    var el = $('<div><h1>Example Title</h1><div id="content">Example Body</div></div>');

    el.ploneOverlay();
    var old_iframe_height = $.iframe.el.css('height');
    el.ploneOverlay('show');
    assert($.iframe.el.css('height') !== old_iframe_height);
    el.ploneOverlay('hide');
    assert($.iframe.el.css('height') === old_iframe_height);

    // TODO: not sure how to tests scrollling
  },

  "ploneinit integration": function(done) {
    var el = $('<div><h1>Example Title</h1><div id="content">Example Body</div></div>');
    $.plone.init.register(function(context) {
      assert(true);
      done();
    });
    el.ploneOverlay();
  }

});

}(jQuery));
