/** @jsx React.DOM */
"use strict";

// ============================================================
// View
// ============================================================

var SendToFacebook = React.createClass({
  sendProductsToFb: function() {
    sendServerReq('get','itemScrape',{});
  },
  render: function() {
    return (
      <button onClick={this.sendProductsToFb}>Request Facebook Scrape</button>
    );
  }
});  

var ItemArea = React.createClass({
  getInitialState: function() {
    return { 
      itemsInfo: {}
    };
  },

  processFetchedItems: function(items) {
  },

  getItems: function() {
  },

  componentWillMount: function() {
    this.getItems();
  },

  render: function() {
    var columnStyle = {
      display: "inline-block",
      width: "50%" 
    };
    return (
      <div className="itemArea">
        <SendToFacebook />
      </div>
    );
  }
});


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

function sendServerReq(method, path, json_payload, res) {
  console.log("submitting, method: "+method+" path: "+path);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status==200) {
        console.log('sendServerReq('+method+'):'+xhr.responseText);
        if (res) {
          res(JSON.parse(xhr.responseText));
        }
      } else {
        console.error('sendServerReq('+method+') failed');
      }
    }
  };
  xhr.open(method, path, true);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.send(JSON.stringify(json_payload));
}

// log the user in/ask permissions
// note: on_logged_in() takes further actions
var item_area = <ItemArea/>;
React.renderComponent(item_area, $('item_area') );
