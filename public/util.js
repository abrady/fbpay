/** @jsx React.DOM */
"use strict";

// TODO:
// restrict item editing to developers of app

// ============================================================
// Object 
// ============================================================

var DB = {
  Item: Parse.Object.extend('Item'),
  listeners: {},
  addEventListener: function(event, func) {
    if(!this.listeners[event]) {
      this.listeners[event] = []
    }
    var listeners = this.listeners[event];
    if (listeners.indexOf(func) > -1) {
      console.error('duplicate function listener '+func);
    }
    listeners.push(func);
  },
  removeEventListener: function(event, func) {
    var i = this.listeners.indexOf(func);
    if(i < 0) {
      console.error('removing unknown function '+func);
    }
    this.listeners.splice(i,1);
  },
  fireEvent : function(event, context) {
    var listeners = this.listeners[event];
    if (!listeners) {
      return;
    }
    listeners.forEach(function(l) { l(event, context); });
  }
};

// ============================================================
// Data
// ============================================================
 
function ge(e) {
  return typeof e == 'string' ? document.getElementById(e) : e;
};
function $(args) {
  var e = ge.apply(this, arguments);
  if (!e) {
    throw new Error('Tried to get element '+args+'but it is not present in the page. Use ge() instead.');
  }
  return e;
}

/**
* Send a request to the server.
* @param method: get, post, delete, etc
* @param path: path on the server to hit
* @param payload: dictionary of params to send, must be JSON.stringable
*/
function sendServerReq(method, path, payload, res_cb, err_cb) {
  console.log("submitting, method: "+method+" path: "+path);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status==200) {
        console.log('sendServerReq('+method+'):'+xhr.responseText);
        if (res_cb) {
          res_cb(JSON.parse(xhr.responseText));
        }
      } else {
        console.error('sendServerReq('+method+') failed'+xhr.responseText);
        if (err_cb) {
          err_cb(xhr.responseText ? JSON.parse(xhr.responseText) : {err:xhr.statusText});
        }
      }
    }
  };
  xhr.open(method, path, true);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.send(JSON.stringify(payload));
}
