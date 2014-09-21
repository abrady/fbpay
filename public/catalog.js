/** @jsx React.DOM */
"use strict";

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
  onItemOpenGraphID: function(og_id) {
    var og = { id: og_id, updatedAt: new Date() };
    this.state.item.set('og', og);
    this.state.item.save();
    this.forceUpdate();
  },
  render: function() {
    var item = { title: '', image: '', description: '', USD: ''};
    var updated_at = '';
    var update_button = '';
    var og_id_column_classnames = "label large-6 medium-6 column";
    var og_id_column = <div className={'secondary '+og_id_column_classnames}>
          Not Yet Published To Facebook
    </div>;
    if (this.state.item) {
      for(var k in item) {
        item[k] = this.state.item.get(k);
      }
      item.id = this.state.item.id;
      
      updated_at = "Last Saved: "+ this.state.item.updatedAt;
      update_button = (
        <div className="column small-3">
          <SendToFacebook parent={this} itemID={this.state.item.id} updatedAt={this.state.item.updatedAt}/>
        </div>
      );
      
      // TODO: indicate if unpublished changes have been made
      var og = this.state.item.get('og');
      if (og) {
        var status_level = 'secondary';
        var label = "Last Published to Facebook: ";
        if(og.updatedAt < this.state.item.updatedAt) {
          status_level='warning';
          label = "Out Of Date. Last Published: ";
        }
        og_id_column = <div className={status_level+' '+og_id_column_classnames}>
          <label>{label + " " + moment(og.updatedAt).fromNow()}</label>
          {og.id}
        </div>;
      }
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
              <input type="text" name="description" value={item.description} onChange={this.handleChange} />
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
            {og_id_column}
            <button className="column small small-2 radius alert button right" onClick={this.deleteItem}>
              Delete
            </button>
          </div>
          <hr/>
        </div>
      </div>
    );
  }
});

var Items = React.createClass({
  queryItems: function() {
    var query = new Parse.Query(DB.Item);
    query.ascending("createdAt").find({
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
  onScrapeResultSuccess: function(og_id) {
    this.props.parent.onItemOpenGraphID(og_id);
    this.setState({scrapeResult: true});
  },
  sendProductsToFb: function() {
    sendServerReq(
      'get',
      'itemScrape?id='+this.props.itemID,
      {},
      function(res) { this.onScrapeResultSuccess(res.ogID); }.bind(this),
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

      if (!this.state.scrapeResult) {
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

// TODO: 
// log the user in/ask permissions or else anyone can modify this catalog
// 
var item_area = <ItemArea/>;
React.renderComponent(item_area, $('item_area') );
