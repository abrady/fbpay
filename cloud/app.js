var express = require('express');
var fb = require('cloud/fb.js')
var fbconfig = require('cloud/fbconfig.js');
var parseconfig = require('cloud/parseconfig.js');

// Global app configuration section
var app = express();
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body

// I always forget these params:
// req: http://nodejs.org/api/http.html#http_http_incomingmessage
index = function(req, res) {
  res.render('index', { fbconfig: { app_id: fbconfig.app_id}, parseconfig: parseconfig });
}
app.post('/', index);
app.get('/', index);

app.get('/hello', function(req,res) {
  res.render('hello', {message:'hello world!'});
});

itemOGResponse = function(req,res) {
  var full_url = 'https://'+req.headers.host + req.url;
  var id = req.query.id;
  console.log('og response for item id: '+id);
  // TODO: fetch the object on the server
  var query = new Parse.Query("Item");
  query.get(id, {
    success: function(item) {
      console.log('got item '+item.id);
      res.render('item', { og_url: full_url, item: item });
    },
    error: function(object, error) {
      res.end(JSON.stringify({error: error}));
    }
  });
}
app.get('/item', itemOGResponse);
app.post('/item', itemOGResponse);

// send all items to facebook for scraping
// expects JSON response
app.get('/itemScrape', function(req,res) {
  console.log('item scrape: '+JSON.stringify(req.query));
  // if successful this response will contain a JSON object with what Facebook parsed from the OG item, e.g.:
  // {"url":"https://fbpay.parseapp.com/item","type":"product","title":"The Smashing Pack","image":[{"url":"http://www.friendsmash.com/images/pack_600.png"}],"description":"A smashing pack full of items!","updated_time":"2014-09-14T07:29:23+0000","data":{"price":[{"amount":2.99,"currency":"USD"},{"amount":1.99,"currency":"GBP"}]},"id":"721711664566619"} 
  
  var id = req.query.id;
  fb.graphRequest(
    '/', 
    { 
      id:'https://fbpay.parseapp.com/item?id='+id,
      scrape:true,
      method:'post'
    },
    'get',
    function(r) {
      console.log('done: success');
      res.end(JSON.stringify({res:'success'}));
    },
    function(err) {
      console.log('done: fail');
      res.statusCode = 400;
      res.end(JSON.stringify({res:false, error: err}));
    }
  );
});

rtu = function(req,res) {
  console.log('rtu call');
  // query: {"hub.mode":"subscribe","hub.challenge":"690749552","hub.verify_token":"shared_secret"}
  // console.log('hub: '+JSON.stringify(req.query));
  res.end(req.query['hub.challenge']);
}

app.get('/rtu', rtu);
app.post('/rtu', rtu);

// TODO: dynamic pricing - https://developers.facebook.com/docs/howtos/payments/definingproducts#pricing_dynamic
// Order fulfillment: https://developers.facebook.com/docs/howtos/payments/fulfillment
// 
app.listen();
