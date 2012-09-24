
// helper method that creates element which will get picked by iframed.js script
function createElement(name, resources, content) {
  el = document.createElement("div");
  el.setAttribute('data-iframe', name);
  el.setAttribute('data-iframe-resources', resources);
  el.innerHTML = content;
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}
