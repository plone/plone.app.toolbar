// This plugin is used to put selected element into iframe.
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


(function(window, document) {
"use strict";

// # IFramed Object
var IFramed = function(el) { this.init(el); };
IFramed.prototype = {
  add: function(el) {
    var self = this;

    // make sure original element is hidden
    el.setAttribute("style", "display:none;");

    // 
    self.content += el.innerHTML;

    // get options from original element
    self.updateOption(el, 'name', 'noname_frame');
    self.updateOption(el, 'title', '');
    self.updateOption(el, 'doctype', '<!doctype html>');
    self.updateOption(el, 'style', '');

    // get resources (js/css/less)
    var resources = el.getAttribute('data-iframe-resources');
    if (resources) {
      resources = resources.split(';');
      for (var i = 0; i < resources.length; i += 1) {
        var url = resources[i].replace(/^\s+|\s+$/g, ''),
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
    }
  },
  updateOption: function(el, name, _default) {
    var self = this,
        option_name = 'data-iframe-' + name;
    if (name === 'name') {
      option_name = 'data-iframe';
    }
    var value = el.getAttribute(option_name);
    if (name === 'data-iframe-resources') {
      value = value.split(';');
    }
    if (value) {
      self.options[name] = value;
    } else if (self.options[name] === undefined) {
      self.options[name] = _default;
    }
  },
  init: function(el) {
    var self = this;

    self.options = {};
    self.content = '';
    self.resources = '';
    self.loaded = false;

    self.add(el);

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
          '<body onload="parent.window.iframed[\'' +
              self.options.name + '\'].load()">' +
            self.content + self.resources +
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
    document.body.setAttribute('style',
        document.body.getAttribute('style') || '' +
        ';border-top:0' +
        ';margin-top:' + self.el.offsetHeight + 'px;');
  }
};

// # Initialize
function initialize() {

  // Check for DOM to be ready
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

  // initialize IFramed object for each of them
  window.iframed = {};
  for (var j = 0; j < matching.length; j += 1) {
    var name = matching[j].getAttribute('data-iframe');
    if (window.iframed[name] === undefined) {
      window.iframed[name] = new IFramed(matching[j]);
    } else {
      window.iframed[name].add(matching[j]);
    }
  }
  for (var iframe in window.iframed) {
    if (window.iframed.hasOwnProperty(iframe)) {
      window.iframed[iframe].open();
    }
  }
}
initialize();

}(window, window.document));
