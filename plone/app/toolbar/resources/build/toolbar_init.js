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
  regexp:true, undef:true, strict:true, trailing:true, browser:true */(function(e,t,n){"use strict";e.IFrame=function(e){this.init(e)},e.IFrame.prototype={add:function(e){var t=this,n;e.setAttribute("style","display:none;"),t.content+=e.innerHTML,t.updateOption(e,"name","noname_frame"),t.updateOption(e,"title",""),t.updateOption(e,"doctype","<!doctype html>"),t.updateOption(e,"style",""),t.updateOption(e,"position","top"),t.updateOption(e,"resources",""),t.updateOption(e,"styles","")},updateOption:function(e,r,i){var s=this,o="data-iframe-"+r;r==="name"&&(o="data-iframe");var u=e.getAttribute(o);if(r==="resources"){if(u){u=u.split(";");for(var a=0;a<u.length;a+=1){var f=u[a].replace(/^\s+|\s+$/g,""),l="",c={},h;if(f.indexOf("?")!==-1){var p=f.slice(f.indexOf("?")+1,f.length).split("&");for(var d=0;d<p.length;d+=1){h=p[d].split("=");if(h[1][0]==='"'||h[1][0]==="'")h[1]=h[1].slice(1,h[1].length-1);c[h[0]]=h[1]}f=f.slice(0,f.indexOf("?"))}f.slice(-3)===".js"?(l=t.createElement("script"),l.src=f,l.type="text/javascript",l.async=!1):f.slice(-4)===".css"?(l=t.createElement("link"),l.href=f,l.type="text/css",l.rel="stylesheet"):f.slice(-5)===".less"&&(l=t.createElement("link"),l.href=f,l.type="text/css",l.rel="stylesheet/less");if(l!==""){for(h in c)l.setAttribute(h,c[h]);s.resources+=l.outerHTML}}}}else if(r==="styles"&&u){var v=t.createElement("style");v.type="text/css",v.textContent=u,s.resources+=v.outerHTML}u?s.options[r]=u:s.options[r]===n&&(s.options[r]=i)},init:function(e){var n=this;n.options={},n.content="",n.resources="",n.loaded=!1,n.add(e);var r=t.createElement("iframe");r.setAttribute("frameBorder","0"),r.setAttribute("border","0"),r.setAttribute("allowTransparency","true"),r.setAttribute("scrolling","no"),r.setAttribute("id",n.options.name),r.setAttribute("name",n.options.name),r.setAttribute("style","display:none;"),t.body.appendChild(r),n.el=r,n.window=r.contentWindow,n.document=n.window.document},open:function(){var e=this;e.document.open(),e.document.write(e.options.doctype+"<html>"+"<head>"+"<title>"+e.options.title+"</title>"+'<meta http-equiv="X-UA-Compatible" content="IE=edge">'+"</head>"+"<body onload=\"parent.window.iframe['"+e.options.name+"'].load()\">"+e.content+e.resources+"</body>"+"</html>"),e.document.close()},load:function(){var e=this;if(e.loaded===!0)return;e.loaded=!0,e.document.body.setAttribute("style",(e.document.body.getAttribute("style")||"")+"background:transparent;"),e.el.setAttribute("style","border:0;overflow:hidden;position:absolute;left:0px;position:fixed;overflow:hidden;width:100%;background-color:transparent;z-index:500;"+e.options.style),e.el.setAttribute("style",e.el.getAttribute("style")+"height:"+e.document.body.offsetHeight+"px;"),e.options.position==="top"?(e.el.setAttribute("style",e.el.getAttribute("style")+"top:0px;"),t.body.setAttribute("style",(t.body.getAttribute("style")||"")+";border-top:0"+";margin-top:"+e.el.offsetHeight+"px;")):e.options.position==="bottom"&&(e.el.setAttribute("style",e.el.getAttribute("style")+"bottom:0px;"),t.body.setAttribute("style",(t.body.getAttribute("style")||"")+";border-bottom:0"+";margin-bottom:"+e.el.offsetHeight+"px;"))}},e.iframe_initialize=function(){var r,i,s,o,u;s=t.getElementsByTagName("body")[0];if(s===n){e.setTimeout(e.iframe_initialize,23);return}o=[];if(t.querySelectorAll!==n)o=t.querySelectorAll("[data-iframe]");else{var a=t.getElementsByTagName("*");for(r=0;r<a.length;r+=1)a[r].getAttribute("data-iframe")&&o.push(a[r])}e.iframe={};for(i=0;i<o.length;i+=1){var f=o[i].getAttribute("data-iframe");e.iframe[f]===n?e.iframe[f]=new e.IFrame(o[i]):e.iframe[f].add(o[i])}for(u in e.iframe)e.iframe.hasOwnProperty(u)&&e.iframe[u].open()},e.iframe_initialized!==!0&&(e.iframe_initialized=!0,e.iframe_initialize())})(window,window.document);