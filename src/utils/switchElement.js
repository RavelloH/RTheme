'use client';

import ReactDOM from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';
import getXPathTo from '../assets/js/lib/getXPathTo';
import log from './log';

function reactDomToHtmlString(reactElement) {
    return ReactDOMServer.renderToString(reactElement);
}

let domTree = {};

function isContextSame(element, context) {
    if (
        element.innerHTML.replaceAll(' ', '').replaceAll(';', '') !==
        reactDomToHtmlString(context)
            .replaceAll('<!-- -->', '')
            .replaceAll(' ', '')
            .replaceAll(';', '')
    ) {
        return false;
    }
    return true;
}

// 切换元素内容
function switchElementContent(selector, context, time = 300) {
    log.info('<switchElementContent>', selector);
    let element;
    if (time == 0) {
        const element = document.querySelector(selector);
        if (typeof context == 'object') {
            if (!isContextSame(element, context) && domTree[getXPathTo(element)]) {
                domTree[getXPathTo(element)].unmount();
                domTree[getXPathTo(element)] = null;
            }
            if (domTree[getXPathTo(element)]) {
                domTree[getXPathTo(element)].render(context);
            } else {
                domTree[getXPathTo(element)] = ReactDOM.createRoot(element);
                domTree[getXPathTo(element)].render(context);
            }
        } else {
            if (!isContextSame(element, context) && domTree[getXPathTo(element)]) {
                domTree[getXPathTo(element)].unmount();
                domTree[getXPathTo(element)] = null;
            }
            element.innerHTML = context;
        }
    } else {
        if (typeof selector == 'object') {
            element = selector;
        } else {
            element = document.querySelector(selector);
            if (element == null) {
                throw 'Unable to obtain target DOM element';
            }
        }
        if (element !== null) {
            if (typeof context == 'object') {
                if (!isContextSame(element, context)) {
                    element.style.opacity = '1';
                    element.style.transition = 'opacity ' + time + 'ms';
                    element.style.opacity = '0';
                    setTimeout(function () {
                        if (!isContextSame(element, context) && domTree[getXPathTo(element)]) {
                            domTree[getXPathTo(element)].unmount();
                            domTree[getXPathTo(element)] = null;
                        }
                        if (domTree[getXPathTo(element)]) {
                            domTree[getXPathTo(element)].render(context);
                        } else {
                            domTree[getXPathTo(element)] = ReactDOM.createRoot(element);
                            domTree[getXPathTo(element)].render(context);
                        }
                        element.style.opacity = '1';
                    }, time);
                }
            } else {
                if (element.innerHTML !== context) {
                    if (!isContextSame(element, context) && domTree[getXPathTo(element)]) {
                        domTree[getXPathTo(element)].unmount();
                        domTree[getXPathTo(element)] = null;
                    }
                    element.style.opacity = '1';
                    element.style.transition = 'opacity ' + time + 'ms';
                    element.style.opacity = '0';
                    setTimeout(function () {
                        element.innerHTML = context;
                        element.style.opacity = '1';
                    }, time);
                }
            }
        }
    }
}

export default switchElementContent;
