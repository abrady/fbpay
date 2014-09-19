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
// View
// ============================================================

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var Item = React.createClass({
  getInitialState: function() {
    return {item: null};
  },
  componentDidMount: function() {
    if (!this.props.itemID) {
      return;
    }
    var query = new Parse.Query(DB.Item);
    query.get(this.props.itemID, {
      success: function(item) {
        this.setState({item: item});
      }.bind(this),
      error: function(object, error) {
        alert("Error fetching item "+this.prips.itemID);
      }
    });
  },
  handleChange: function(event) {
    var item = this.state.item;
    item.set(event.target.name, event.target.value);
    item.save();
    this.setState({item: item});
  },
  deleteItem: function() {
    if(this.state.item) {
      this.state.item.destroy({
        success: function(obj) {
          DB.fireEvent('itemDelete',obj.id);
        },
        error: function(obj, error) {
          alert(JSON.stringify(error));
        }
      });
    }
  },
  render: function() {
    var item = { title: '', image: '', description: '', USD: ''};
    var updated_at = '';
    var update_button = '';
    if (this.state.item) {
      for(var k in item) {
        item[k] = this.state.item.get(k);
      }
      item.id = this.state.item.id;
      
      updated_at = "Last Saved: "+ this.state.item.updatedAt;
      update_button = (
        <div className="column small-6">
          <SendToFacebook itemID={this.state.item.id} updatedAt={this.state.item.updatedAt}/>
        </div>
      );
    }
    // special property, set this explicitly always to make printing below easier
    if (!item.id) {
      item.id = '';
    }
    

    return (
      <div>
        <div className="row">
          <div className="large-12 columns">
            <h4>Item {item.id}</h4>
            <div className="large-4 medium-4 columns">
              <label>Title</label>
              <input type="text" name="title" value={item.title} onChange={this.handleChange} />
            </div>
            <div className="large-4 medium-4 columns">
              <label>Image</label>
              <input type="text" name="image" value={item.image} onChange={this.handleChange} />
            </div>
            <div className="large-4 medium-4 columns">
              <label>Description</label>
              <input type="text" name="description" value={item.description} />
            </div>
            <div className="large-2 medium-2 columns end">
              <label>USD</label>
              <input type="text" name="USD" value={item.USD} onChange={this.handleChange} />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="small-12 columns">
            {update_button}
            <button className="column small small-2 radius alert button right" onClick={this.deleteItem}>
              Delete
            </button>
            <hr/>
          </div>
        </div>
      </div>
    );
  }
});

var Items = React.createClass({
  queryItems: function() {
    var query = new Parse.Query(DB.Item);
    query.descending("createdAt").find({
      success: function(results) {
        this.setState({items:results});
      }.bind(this),
      error: function(error) {
        alert("Error Fetching Items: " + error.code + " " + error.message);
      }
    });
  },
  handleItemDelete: function(event, item_ID) {
    this.queryItems();
  },
  componentDidMount: function() {
    DB.addEventListener('itemDelete', this.handleItemDelete);
  },
  componentWillUnmount: function() {
    DB.removeEventListener('itemDelete', this.handleItemDelete);
  },
  getInitialState: function() {
    this.queryItems();
    return { items: [] };
  },

  createNewItem: function() {
    var item = new DB.Item();
    item.save({}).then(function() { this.queryItems(); }.bind(this));
  },

  render: function() {
    var items = [];
    for(var i = 0; i < this.state.items.length; i++) {
      var item = this.state.items[i];
      items.push(<Item key={item.id} itemID={item.id} />);
    }

    return (
      <div className="large-12 columns">
        {items}
        <ul className="button-group">
          <li>
            <button className="small radius button columns" onClick={this.createNewItem}>
              New Item
            </button>
          </li>
        </ul>
      </div> 
    );
  }
});

var SendToFacebook = React.createClass({
  getInitialState: function() {
    return { 
      scrapeResult: null,
      updatedAt: this.props.updatedAt
    };
  },
  componentWillReceiveProps: function() {
  },
  sendProductsToFb: function() {
    sendServerReq(
      'get',
      'itemScrape?id='+this.props.itemID,
      {},
      function(res) { this.setState({scrapeResult: true});}.bind(this),
      function(err) { this.setState({scrapeResult: false});}.bind(this)
    );
  },
  render: function() {
    var button = 
      <button className="small radius button" onClick={this.sendProductsToFb}>
       Update
      </button>;
    var scrape_res = null;
    if (this.state.scrapeResult !== null) {
      var close_cb = function() { 
        this.setState({scrapeResult: null});
      }.bind(this);
      var close_x = 
        <a 
          onClick={close_cb} 
          className="small close">
            &times;
        </a>;

      if (this.state.scrapeResult) {
        scrape_res = 
          <div data-alert className="small success radius left">
            Updated on Facebook Successfully
            {close_x}
          </div>;
      } else {
        // TODO: link to actual problem item
        scrape_res = 
          <div data-alert className="alert-box alert radius left">
            Scrape Failed. Check OG Debug Tool
            {close_x}
          </div>;
      }
    }
    return (
      <div className>
        <div className="left">
          {button}
        </div>
        <div className="left">
          {scrape_res}
        </div>
      </div>
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
        <Items />
      </div>
    );
  }
});


var PayArea = React.createClass({
  payClicked: function() {
    FB.ui(
      {
        method: 'pay',
        action: 'purchaseitem',
        product: 'http://fbpay.parseapp.com/item'
        // quantity: 10,   // optional, defaults to 1
        // request_id: ''  // optional, must be unique for each payment
      },
      this.payClickedCallback
    );
  },

  payClickedCallback: function(res) {
    console.log('pay clicked result'+JSON.stringify(res));
  },

  render: function() {
    return (
      <div className="row">
        <div className="large-12 columns">
          <div className="large-6 medium-6 columns">
            <div className="payArea">
              <button className="small radius button" onClick={this.payClicked}>Test Pay</button>
            </div>
          </div>
        </div>
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

// log the user in/ask permissions
// note: on_logged_in() takes further actions
var item_area = <ItemArea/>;
React.renderComponent(item_area, $('item_area') );

// TODO: stick this on canvas app
//var pay_area = <PayArea/>;
//React.renderComponent(pay_area, $('pay_area') );
