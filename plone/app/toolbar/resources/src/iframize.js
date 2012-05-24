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
      resources: self.getAttribute('resources', '').split(';')
    };

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.setAttribute('frameBorder', '0');
    iframe.setAttribute('border', '0');
    iframe.setAttribute('allowTransparency', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('id', self.options.name);
    iframe.setAttribute('name', self.options.name);
    // TODO: apply correct styles for position (top, bottom, left, right)
    iframe.setAttribute("style","border:0;overflow:hidden;" +
        "position:absolute;left:0px;position:fixed;top:0px;overflow:hidden;" +
        "width:100%;background-color:transparent;");

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

    // TODO: connect to history code to listen to events

    // Inject the reousrces (js/css/less)
    for (var i = 0; i < self.options.resources.length; i += 1) {
      var url = self.options.resources[i].replace(/^\s+|\s+$/g, ''),
          resource = '';
      if (url.slice(-3) === '.js') {
        resource = document.createElement('script');
        resource.src = url;
        resource.type = 'text/javascript';
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
        self.document.body.appendChild(resource);
      }
    }

  },
  getAttribute: function(name, _default) {
    if (name === 'name') { name = 'data-iframe'; }
    else { name = 'data-iframe-' + name; }
    var attr = this.el_original.getAttribute(name);
    if (attr) { return attr; }
    return _default;
  },
  close: function() {
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


/*
// Globals
var
  bh = namespace.bh = namespace.bh || {},
  location = namespace.location;

// Compatibility
bh.data = bh.data || namespace.bh_init_data;
bh.widgetType = bh.widgetType || namespace.bh_widget_type;
bh.testing = bh.testing || namespace.bh_testing;
bh.url = bh.url || namespace.bh_url;
bh.apiKey = bh.apiKey || namespace._bugHerdAPIKey;
bh.sidebarJS = namespace.bh.sidebarJS;
bh.sidebarCSS = namespace.bh.sidebarCSS;

// Close the window
bh.close = function(){
  // window.close does not work by itself, you have to do this hack
  // http://productforums.google.com/d/msg/chrome/GjsCrvPYGlA/pdvPRzBA4WwJ
  window.open('', '_self', '');
  window.close();
};

// Load the html
bh.load = function(){
 //removed this check as it prevents the body==null from doing its thing for Opera
  // // Check
  // if ( bh.loading ) {
  //   return;
  // }
  // bh.loading = true;

  // Prepare
  var head = document.getElementsByTagName('head')[0];
  var body = document.getElementsByTagName('body')[0];

  // Check
  if ( body == null) {
    window.setTimeout(bh.load, 23);
    return;
  }

// Inject the CSS
  var c = document.createElement('link');
  c.type = "text/css";
  c.rel = "stylesheet";
  c.href = bh.url+"/gui.css";
  head.appendChild(c);

  // Create iframe
  var iframe = document.createElement('iframe');

  // Create our bugherd container iframe
  iframe.setAttribute("style","border:0;overflow:hidden;position:absolute;right:0px;position:fixed;top:0px;overflow:hidden;width:100%;background-color:transparent;");
  iframe.setAttribute('frameBorder', '0');
  iframe.setAttribute('border', '0');
  iframe.setAttribute('allowTransparency', 'true');
  iframe.setAttribute('id', '_BH_frame');
  iframe.setAttribute('name', '_BH_frame');
  iframe.setAttribute('scrolling', 'no');

  document.body.appendChild(iframe);

  // Apply
  bh.iframe = iframe;
  bh.win = iframe.contentWindow;
  bh.doc = bh.win.document;


  bh.doc.open().write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><head><title>BugHerd Sidebar</title><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body onload="parent.window.bh.loaded()">'+bh.data.h+'</body></html>');
  bh.doc.close();
};

// Loaded
bh.loaded = function(){
  // Check
  if ( bh.loadingComplete ) {
    return;
  }
  bh.loadingComplete = true;

  // What to do when the page state changes
  var stateChange = function(){
    if ( bh.win.bugherd ) {
      bh.win.bugherd.stateChange();
    }
  };

  // Check the url for state changes
  var currentUrl = location.href;
  var locationInterval = setInterval(function(){
    if ( currentUrl !== location.href ) {
      currentUrl = location.href;
      stateChange();
    }
  },3000);

  // Check events for state changes
  if ( window.addEventListener ) {
    window.addEventListener('hashchange',stateChange);
    window.addEventListener('popstate',stateChange);
  }
  else if ( window.attachEvent ) {
    window.attachEvent('hashchange',stateChange);
    window.attachEvent('popstate',stateChange);
  }

  // Check history.js for state changes
  if ( window.History && window.History.Adapter ) {
    window.History.Adapter.bind(window,'statechange',stateChange);
    window.History.Adapter.bind(window,'anchorchange',stateChange);
  }

  // Inject Script
  var script = bh.doc.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', bh.sidebarJS);
  bh.doc.body.appendChild(script);

  // Inject more Styles
  var style = bh.doc.createElement('link');
  style.setAttribute('href', bh.url+"/sidebar/css/sidebar.css");
  style.setAttribute('href', bh.sidebarCSS);
  style.setAttribute('type', 'text/css');
  style.setAttribute('rel', 'stylesheet');
  bh.doc.body.appendChild(style);
};

bh.load();
*/
