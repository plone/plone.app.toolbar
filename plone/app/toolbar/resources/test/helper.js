
// helper method that creates element which will get picked by iframe.js script
function createElement(name, resources, content, extra_options) {
  var k;

  if (!extra_options) {
    extra_options = {};
  }
  el = document.createElement("div");
  el.setAttribute('data-iframe', name);
  el.setAttribute('data-iframe-resources', resources);
  for (k in extra_options) {
    if (extra_options.hasOwnProperty(k)) {
      el.setAttribute('data-iframe-'+k, extra_options[k]);
    }
  }
  el.innerHTML = content;
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}

// Get the computed style from an element
// Inspired by: http://www.quirksmode.org/dom/getstyles.html
function getStyle(el, styleProp) {
  if (typeof el.currentStyle !== 'undefined') {
    if (typeof el.currentStyle.getPropertyValue === 'function') {
      return el.currentStyle.getPropertyValue(styleProp);
    }
    return el.currentStyle[styleProp];
  }

  if (typeof el.ownerDocument.defaultView.getComputedStyle === 'function') {
    return el.ownerDocument.defaultView.getComputedStyle(el,null).getPropertyValue(styleProp);
  }

  return "";
}
