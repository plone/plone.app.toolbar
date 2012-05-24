// This plugin is used to put selected into iframe. {{{
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

// }}}

(function(window, document) {
"use strict";

// # IFrame {{{
var IFrame = function(el) { this.init(el); };
IFrame.prototype = {
  init: function(el) {
    var self = this;

    // store original element on IFrame object and make sure its hidden
    self.el_original = el;
    self.el_original.setAttribute("style", "display:none;");

    // mark iframe as not yet loaded
    self.loaded = false;

    // get options from original element
    self.options = {
      name: self.getAttribute('name', '_iframize'),
      title: self.getAttribute('title', ''),
      doctype: self.getAttribute('doctype', '<!doctype html>'),
      style: self.getAttribute('style', ''),
      resources: self.getAttribute('resources', '').split(';')
    };

    // get resources (js/css/less)
    self.resources = '';
    for (var i = 0; i < self.options.resources.length; i += 1) {
      var url = self.options.resources[i].replace(/^\s+|\s+$/g, ''),
          resource = '';
      if (url.slice(-3) === '.js') {
        resource = document.createElement('script');
        resource.src = url;
        resource.type = 'text/javascript';
        resource.async = false;
      } else if (url.slice(-4) === '.css') {
        resource = document.createElement('link');
        resource.href = url;
        resource.type = 'text/css';
        resource.rel = 'stylesheet';
      } else if (url.slice(-5) === '.less') {
        resource = document.createElement('link');
        resource.href = url;
        resource.type = 'text/less';
        resource.rel = 'stylesheet';
      }
      if (resource !== '') {
        self.resources += resource.outerHTML;
      }
    }

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.setAttribute('frameBorder', '0');
    iframe.setAttribute('border', '0');
    iframe.setAttribute('allowTransparency', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('id', self.options.name);
    iframe.setAttribute('name', self.options.name);
    iframe.setAttribute('style', 'display:none;');

    document.body.appendChild(iframe);

    self.el = iframe;
    self.window = iframe.contentWindow;
    self.document = self.window.document;
  },
  open: function() {
    var self = this;
    self.document.open();
    self.document.write(
        self.options.doctype +
        '<html>' +
          '<head>' +
            '<title>' + self.options.title + '</title>' +
            '<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
          '</head>' +
          '<body onload="parent.window.iframized[\'' +
              self.options.name + '\'].load()">' +
            self.el_original.innerHTML +
            self.resources +
          '</body>' +
        '</html>');
    self.document.close();
  },
  load: function() {
    var self = this;

    // check if already loaded
    if ( self.loaded === true ) {
      return;
    }

    // mark iframe as loaded
    self.loaded = true;

    self.el.setAttribute('style', 'border:0;overflow:hidden;' +
        'position:absolute;left:0px;position:fixed;top:0px;overflow:hidden;' +
        'width:100%;background-color:transparent;z-index:500;' +
        self.options.style);
    self.el.setAttribute('style', self.el.getAttribute('style') +
        'height:' + self.document.body.offsetHeight + 'px;');
    self.document.body.setAttribute('style',
        self.document.body.getAttribute('style') || '' +
        'background:transparent;');
    document.body.setAttribute('style', document.body.getAttribute('style') || '' +
        ';margin-top:' + self.el.offsetHeight + 'px;');
  },
  getAttribute: function(name, _default) {
    if (name === 'name') { name = 'data-iframe'; }
    else { name = 'data-iframe-' + name; }
    var attr = this.el_original.getAttribute(name);
    if (attr) { return attr; }
    return _default;
  }
};
// }}}

// # Initialize {{{
function initialize() {

  // Check
  var body = document.getElementsByTagName('body')[0];
  if (body === undefined) {
    window.setTimeout(initialize, 23);
    return;
  }

  // find [data-iframe] elements in context
  var matching = [];
  if (document.querySelectorAll !== undefined) {
    matching = document.querySelectorAll('[data-iframe]');
  } else {
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i += 1) {
      if (all[i].getAttribute('data-iframe')) {
        matching.push(all[i]);
      }
    }
  }

  // initialize IFrame object for each of them  and store them
  window.iframized = {};
  for (var j = 0; j < matching.length; j += 1) {
    var name = matching[j].getAttribute('data-iframe');
    window.iframized[name] = new IFrame(matching[j]);
    window.iframized[name].open();
  }

}
initialize();
// }}}

}(window, window.document));
