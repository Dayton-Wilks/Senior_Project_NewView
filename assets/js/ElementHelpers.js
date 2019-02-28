//********************************************************
// Element Helpers
function setAttributes(el, attr) {
    for (var key in attr) {
        el.setAttribute(key, attr[key]);
    }
}

function createElement(elType, attr, innerText) {
    let e = document.createElement(elType);
    if (attr != undefined) setAttributes(e, attr);
    if (innerText != undefined) e.innerText = innerText;
    return e;
}

module.exports = { setAttributes, createElement };