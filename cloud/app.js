var express = require('express');
var fb = require('cloud/fb.js')
var fbconfig = require('cloud/fbconfig.js');

// Global app configuration section
var app = express();
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body

// I always forget these params:
// req: http://nodejs.org/api/http.html#http_http_incomingmessage
index = function(req, res) {
  res.render('index', { app_id: fbconfig.app_id });
}
app.post('/', index);
app.get('/', index);

app.get('/hello', function(req,res) {
  res.render('hello', {message:'hello world!'});
});

itemOGResponse = function(req,res) {
  var full_url = 'https://'+req.headers.host + req.url;
  console.log('item url: '+full_url);
  res.render('item', { og_url: full_url });
}
app.get('/item', itemOGResponse);
app.post('/item', itemOGResponse);

// send all items to facebook for scraping
// expects JSON response
app.get('/itemScrape', function(req,res) {
  console.log('item scrape');
  // if successful this response will contain a JSON object with what Facebook parsed from the OG item, e.g.:
  // {"url":"https://fbpay.parseapp.com/item","type":"product","title":"The Smashing Pack","image":[{"url":"http://www.friendsmash.com/images/pack_600.png"}],"description":"A smashing pack full of items!","updated_time":"2014-09-14T07:29:23+0000","data":{"price":[{"amount":2.99,"currency":"USD"},{"amount":1.99,"currency":"GBP"}]},"id":"721711664566619"} 
  fb.graphRequest(
    '/', 
    { 
      id:'https://fbpay.parseapp.com/item',
      scrape:true,
      method:'post'
    },
    'get',
    function(r) {
      console.log('done: success');
      res.end({res:'success'});
    },
    function(err) {
      console.log('done: fail');
      res.statusCode = 400;
      res.end(JSON.stringify(res));
    }
  );
});

rtu = function(req,res) {
  console.log('rtu call');
  // query: {"hub.mode":"subscribe","hub.challenge":"690749552","hub.verify_token":"shared_secret"}
  console.log('hub: '+JSON.stringify(req.query));
  res.end();
}

app.get('/rtu', rtu);

// TODO: dynamic pricing - https://developers.facebook.com/docs/howtos/payments/definingproducts#pricing_dynamic
// scraping:GET https://graph.facebook.com/?id=OBJECT_URL&scrape=true&method=post

app.listen();
