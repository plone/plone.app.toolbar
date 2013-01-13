// This plugin is used to handle all clicks inside iframe.
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
  regexp:true, undef:true, strict:true, trailing:true, browser:true *//*global jQuery:false, define:false */(function(e,t){"use strict";e.IFrame=function(e){this._init(e)},e.IFrame.prototype={_init:function(t){var n=this;n._iframe=t,n.el=e(t.el),n.window=window.parent,n.document=window.parent.document,n._state=null,n._actions=[],e(document).on("click",function(t){var r=e(t.target),i=!1;e.each(n._actions,function(e,r){r[0].apply(this,[t,n])&&r[1].apply(this,[t,n])})}),n.registerAction(function(t){return e.nodeName(t.target,"a")||e(t.target).parents("a").size()===1},function(t){t.stopPropagation(),t.preventDefault();var r=e(t.target).attr("href");e.nodeName(t.target,"a")||(r=e(t.target).parents("a").attr("href")),t.which===1?n._window_location(r):t.which===2&&n._window_open(r)}),n.registerAction(function(t){return e.nodeName(t.target,"html")},function(e){n.shrink()})},_window_location:function(e){window.parent.location.href=e},_window_open:function(e){window.parent.open(e)},registerAction:function(e,t){this._actions.push([e,t])},shrink:function(){var e=this;e._state!==null&&(e.el.css(e._state),e._state=null)},stretch:function(){var t=this;if(t._state===null){t._state={},t._state.height=t.el.height();var n=t.el.offset();t.el.top=n.top,t.el.left=n.left,t.el.css({top:0,left:0,height:e(window.parent.document).height()})}},toggle:function(){var e=this;e._state===null?e.stretch():e.shrink()}},window.parent.iframe!==t&&window.name&&window.parent.iframe[window.name]!==t&&(e.iframe=new e.IFrame(window.parent.iframe[window.name]))})(jQuery);// Creates mask.
//
// Author (of few little changes): Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//
// Description: 
//
//   Stripped down version of jquerytools $.mask which creates mask in top
//   frame.
//
// License:
//
//   I guess same license as jquerytools $.mask code.
//
/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true *//*global jQuery:false */(function(e,t){"use strict";function n(t,n){if(e.browser.msie){var r=e(n).height(),i=e(t).height();return[t.innerWidth||n.documentElement.clientWidth||n.body.clientWidth,r-i<20?i:r]}return[e(n).width(),e(n).height()]}function r(t){if(t)return t.call(e.iframeMask)}e.Mask=function(e){this._init(e)},e.Mask.prototype={_init:function(t){var n=this;n._loaded=!1,n.config=e.extend({maskId:"exposeMask",loadSpeed:"slow",closeSpeed:"fast",closeOnClick:!1,closeOnEsc:!1,window:window.parent,document:window.parent.document,zIndex:400,opacity:.8,startOpacity:0,color:"#000",onLoad:null,onClose:null},t||{})},getMask:function(){var t=this,n=e("#"+t.config.maskId,t.config.document);return n.length||(n=e("<div/>").attr("id",t.config.maskId),e("body",t.config.document).append(n)),n},isLoaded:function(e){return e?this._loaded==="full":this._loaded},getConf:function(){return this.config},load:function(t){var i=this;if(i.loaded)return i;typeof t=="string"&&(t={color:t}),e.extend(i.config,t);var s=i.getMask(),o=n(i.config.window,i.config.document);return s.css({position:"absolute",top:0,left:0,width:o[0],height:o[1],display:"none",opacity:i.config.startOpacity,zIndex:i.config.zIndex}),i.config.color&&s.css("background-color",i.config.color),r(i.config.onBeforeLoad)===!1?i:(i.config.closeOnEsc&&e(i.config.document).on("keydown.mask",function(e){e.keyCode===27&&i.close()}),i.config.closeOnClick&&s.on("click.mask",function(e){i.close()}),e(i.config.window).on("resize.mask",function(){i.fit()}),i._loaded=!0,s.css({display:"block"}).fadeTo(i.config.loadSpeed,i.config.opacity,function(){i.fit(),i._loaded="full",r(i.config.onLoad)}),this)},close:function(){var t=this;if(t.isLoaded()){if(r(t.config.onBeforeClose)===!1)return t;var n=t.getMask();n.fadeOut(t.config.closeSpeed,function(){r(t.config.onClose),t._loaded=!1}),e(t.config.document).off("keydown.mask"),n.off("click.mask"),e(t.config.window).off("resize.mask")}return t},fit:function(){var e=this;if(e.isLoaded()){var t=e.getMask(),r=n(e.config.window,e.config.document);t.css({width:r[0],height:r[1]})}}},e.mask=new e.Mask})(jQuery);// overlay based on bootstrap modal
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/jquery.form.js
//    (optional)++resource++plone.app.toolbar/src/jquery.iframe.js
//    (optional)++resource++plone.app.toolbar/src/jquery.mask.js
//
// Description: 
//    This script is used to provide glue code between iframe and twitter
//    bootstrap modal. And also providing some convinience method for usage in
//    Plone.
//
// License:
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
/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true *//*global tinyMCE:false, TinyMCEConfig:false */(function(e,t){"use strict";var n=function(e,t){this.init(e,t)};n.prototype={init:function(n,r){var i=this;if(i.el)return;r===t&&(r=n,n=t),r=e.extend({},e.fn.ploneOverlay.defaults,typeof r=="object"&&r),i.options=r,i._el=n,i._el&&e.nodeName(i._el[0],"a")&&!i.options.el&&(r.el=n.attr("href")),r.el&&(n=r.el),i._el&&e.nodeName(i._el[0],"a")&&i._el.off("click").on("click",function(e){e.stopPropagation(),e.preventDefault(),i.show()}),typeof n=="function"?i.el=n:typeof n=="string"?i.el=function(t){var r=this;r.options.onBeforeLoad&&r.options.onBeforeLoad.call(r);var i=r.options.changeAjaxURL((n.match(/^([^#]+)/)||[])[1]);e.get(i,{},function(n){r.el=e("<div/>").html(/<body[^>]*>((.|[\n\r])*)<\/body>/im.exec(n)[1]),r.options.onLoaded&&r.options.onLoaded.call(r),r.initModal(),t.call(r)},"html")}:(i.el=n,i.initModal())},initModal:function(){var n=this;n.el=n.options.modalTemplate.apply(n,[n.el]).hide(),n.el.parents("body").size()===0&&n.el.appendTo("body"),n.el.modal({backdrop:"static",dynamic:!0,keyboard:!1,show:!1}),n.el.on("click",function(t){var r=e(t.target);t.stopPropagation();if(!r.hasClass("allowDefault")&&r.attr("type")!=="file"&&r.attr("type")!=="radio"&&r.attr("type")!=="checkbox"){t.preventDefault();if(n._formButtons){var i;e.each(n._formButtons,function(r){var s=e(r,n.el);s.size()!==0&&s[0]===t.target&&(i=r)});if(i){var s=e(i,n.el).parents("form");if(s.size()!==0){var o={};o[e(t.target).attr("name")]=e(t.target).attr("value"),s.ajaxSubmit(e.extend(!0,n._formButtons[i],{data:o}))}}}}}),n.options.formButtons&&(n._formButtons={},e.each(n.options.formButtons,function(t){var r=e(t,n.el);r.size()!==0&&(n._formButtons[t]=n.options.formButtons[t].apply(n,[r]))}));if(e.iframe!==t){var r=e(e.iframe.document).height();n.el.on("show",function(){e.iframe.stretch()}).on("shown",function(){n.el.parents(".modal-wrapper").height()>r&&(e("body",e.iframe.document).height(n.el.parents(".modal-wrapper").height()+n.el.parents(".modal-wrapper").offset().top),n.el.parents(".modal-backdrop").height(e(e.iframe.window).height()))}).on("hidden",function(){e("body",e.iframe.document).height(r),e.iframe.shrink()}),e(e.iframe.document).scroll(function(){var t=n.el.parents(".modal-backdrop");e.iframe&&e.iframe.document&&t.css({top:-1*e(e.iframe.document).scrollTop(),height:e(e.iframe.document).scrollTop()+t.height()})})}e.fn.ploneInit&&n.el.ploneInit(),n.options.onInit&&n.options.onInit.call(n)},show:function(){var e=this;typeof e.el=="function"?e.el.apply(e,[e.show]):(e.el.modal("show"),e.options.onShow&&e.options.onShow.call(e))},hide:function(){var e=this;if(typeof e.el=="function")return;e.el.modal("hide"),e.options.onHide&&e.options.onHide.call(e)},destroy:function(){var e=this;if(typeof e.el=="function")return;e.hide(),e.el.remove(),e._el&&e._el.data("plone-overlay",new n(e._el,e.options)),e.options.onDestroy&&e.options.onDestroy.call(e)},getBaseURL:function(t){return e(/<base[^>]*>((.|[\n\r])*)<\/base>/im.exec(t)[0]).attr("href")}},e.fn.ploneOverlay=function(t){return this.each(function(){var r=e(this),i=e(this).data("plone-overlay");t=t||{},i||e(this).data("plone-overlay",i=new n(r,t)),typeof t=="string"?["show","hide","destroy"].indexOf(t)!==-1&&i[t]():t.show&&i.show()})},e.fn.ploneOverlay.defaultAjaxSubmit=function(n){return n=e.extend({errorMsg:".portalMessage.error",buttonContainer:".modal-footer",responseFilter:"#content",onError:t,onSave:t},n||{}),function(r,i){var s=this;return i=e.extend({},n,i||{}),r.clone().appendTo(e(i.buttonContainer,s.el)).on("click",function(e){e.stopPropagation(),e.preventDefault(),r.trigger("click")}),r.hide(),{dataType:"html",beforeSerialize:function(n,r){var i=e(".mce_editable",n),s=i.attr("id");i.size()!==0&&tinyMCE&&tinyMCE.editors[s]!==t&&(tinyMCE.editors[s].save(),tinyMCE.editors[s].remove())},success:function(t,n,o,u){var a=document,f=e("<div/>").html(/<body[^>]*>((.|[\n\r])*)<\/body>/im.exec(t)[1]);e.iframe&&(a=e.iframe.document),e(i.errorMsg,f).size()!==0?(s.el.remove(),s.el=e(i.responseFilter,f),s.initModal(),i.onError&&i.onError.apply(s,[f,n,o,u,r]),s.show()):i.onSave?i.onSave.apply(s,[f,n,o,u,r]):e(i.responseFilter,a).size()!==0?(e(i.responseFilter,a).html(e(i.responseFilter,f).html()),s.destroy()):s.destroy()}}}},e.fn.ploneOverlay.defaultModalTemplate=function(t){return t=e.extend({title:"h1.documentFirstHeading",body:"#content",destroy:'[data-dismiss="modal"]'},t||{}),function(n){var r=this,i=e('<div class="modal fade">  <div class="modal-header">    <a class="close" data-dismiss="modal">&times;</a>    <h3></h3>  </div>  <div class="modal-body"></div>  <div class="modal-footer"></div></div>'),s=e(".modal-header > h3",i),o=e(".modal-body",i),u=e(".modal-footer",i);return s.html(e(t.title,n).html()),o.html(e(t.body,n).html()),e(t.title,o).remove(),e(t.footer,o).remove(),e(t.destroy,i).off("click").on("click",function(e){e.stopPropagation(),e.preventDefault(),r.destroy()}),i}},e.fn.ploneOverlay.defaults={mask:e.mask||t,onInit:t,onBeforeLoad:t,onLoaded:t,onShow:t,onHide:t,onDestroy:t,formButtons:{},modalTemplate:e.fn.ploneOverlay.defaultModalTemplate(),changeAjaxURL:function(e,t){return t=t||"++unthemed++",e.indexOf("http")===0?e.replace(/^(https?:\/\/[^\/]+)\/(.*)/,"$1/"+t+"/$2"):e.indexOf("/")===0?window.location.protocol+"//"+window.location.host+"/"+t+e:window.location.protocol+"//"+window.location.host+"/"+t+window.location.pathname+"/"+e}},e.fn.ploneOverlay.Constructor=n})(window.jQuery);// 
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++plone.app.toolbar/lib/bootstrap/bootstrap-dropdown.js
//    ++resource++plone.app.toolbar/src/jquery.iframe.js
//
// Description:
//
// License:
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
/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */(function(e,t){"use strict";e(document).ready(function(){e("body").on("click.dropdown.data-api touchstart.dropdown.data-api","#plone-toolbar [data-toggle=dropdown]",function(t){e.iframe._state!==null&&e(".dropdown.open",e(t.target).parents("#plone-toolbar")).size()===0?e.iframe.shrink():e.iframe._state===null&&e.iframe.stretch()}),e.iframe.registerAction(function(t){return e(".dropdown.open",t.target).size()===0},function(t){e.iframe.shrink()})})})(window.jQuery);// This script will register Plone's overlays for toolbar actions.
//
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
  regexp:false, undef:true, strict:true, trailing:true, browser:true */(function(e,t){"use strict";e(document).ready(function(){e("#plone-toolbar #plone-contentmenu-actions > ul > li#delete > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),".modal-body input.destructive":e.fn.ploneOverlay.defaultAjaxSubmit({onSave:function(e,t,n,r,i){window.parent.location.href=this.getBaseURL(n.responseText)}})}}),e("#plone-toolbar #plone-contentmenu-actions > ul > li#rename > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),'.modal-body input[name="form.button.RenameAll"]':e.fn.ploneOverlay.defaultAjaxSubmit({onSave:function(e,t,n,r,i){window.parent.location.href=this.getBaseURL(n.responseText)}})}}),e("#plone-toolbar #plone-contentmenu-workflow > ul > li#advanced > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),'.modal-body input[name="form.button.Publish"]':e.fn.ploneOverlay.defaultAjaxSubmit({onSave:function(e,t,n,r,i){window.parent.location.href=this.getBaseURL(n.responseText)}})}}),e("#plone-toolbar #plone-contentmenu-display > ul > li#contextSetDefaultPage > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),'.modal-body input[name="form.button.Save"]':e.fn.ploneOverlay.defaultAjaxSubmit()}}),e("#plone-toolbar #plone-contentmenu-display > ul > li#folderChangeDefaultPage > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),'.modal-body input[name="form.button.Save"]':e.fn.ploneOverlay.defaultAjaxSubmit()}}),e("#plone-toolbar #plone-action-edit > a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},formButtons:{'.modal-body input[name="form.button.Cancel"]':e.fn.ploneOverlay.defaultAjaxSubmit(),'.modal-body input[name="form.button.Save"]':e.fn.ploneOverlay.defaultAjaxSubmit()}}),e("#plone-toolbar #plone-personal-actions > ul > li#plone-personal-actions-plone_setup a").ploneOverlay({onShow:function(){e(this).dropdown("toggle")},onLoaded:function(){var t=this,n=t.el;n.find("a").on("click",function(r){n.load(e(this).attr("href")),t._el=t.el=t.options.modalTemplate.apply(t,[n]).hide(),r.stopPropagation(),r.preventDefault()})}})})})(window.jQuery);