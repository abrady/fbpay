/** @jsx React.DOM */
"use strict";

var Item = React.createClass({
  buyItem: function() {
    FB.ui({
      method: 'pay',
      action: 'purchaseitem',
      product: 'https://fbpay.parseapp.com/item?id='+this.props.item.id
    },
      function(res) {console.log("buyItem result:"+JSON.stringify(res));}
    );
  },
  render: function() {
    var item = { title: '', image: '', description: '', USD: ''};
    var updated_at = '';
    var update_button = '';
    for(var k in item) {
      item[k] = this.props.item.get(k);
    }

    var img_style = {maxWidth:'50px'};
    return (
      <div>
        <div className="row">
          <div className="large-14 columns">
            <div className="large-1 medium-1 columns">
              <img style={img_style} src={item.image} />
            </div>
            <div className="large-3 medium-3 columns">
              <label>Title</label>
              {item.title}
            </div>
            <div className="large-4 medium-4 columns">
              <label>Description</label>
              {item.description}
            </div>
            <div className="large-2 medium-2 columns">
              <label>USD</label>
              {item.USD}
            </div>
            <div className="large-2 medium-2 columns">
              <button className="radius button" onClick={this.buyItem}>
                Buy
              </button>
            </div>
          </div>
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
        var published_items = results.filter(
          function(item) {
            return item.get('ogID'); // only show og published items
          }
        );
        this.setState({items:published_items});
      }.bind(this),
      error: function(error) {
        alert("Error Fetching Items: " + error.code + " " + error.message);
      }
    });
  },
  getInitialState: function() {
    this.queryItems();
    return { items: [] };
  },
  render: function() {
    var items = [];
    for(var i = 0; i < this.state.items.length; i++) {
      var item = this.state.items[i];
      items.push(<Item key={item.id} item={item} />);
    }
    return (
      <div className="large-12 columns">
        {items}
      </div> 
    );
  }
});

var items = <Items/>;
React.renderComponent(items, $('item_area') );
