//BANDCAMP AUTH AND GET ORDERS

var request = require('request');
var access_token;
var refreshToken;

var config = require('./config');

//get token
request.post({
  url: 'https://bandcamp.com/oauth_token',
  // oauth: {
  // },
  form: {
    'grant_type': 'client_credentials',
    client_id: config.client_id,
    client_secret: config.client_secret
  }
}, function (err, response) {
  if (err)
    console.log("error happz");

  var json = JSON.parse(response.body);
  access_token = json.access_token;
  refreshToken = json.refresh_token;
  console.log(access_token);
  console.log(refreshToken);
  console.log(json);

  //use token to get orders
  request;
  var options = {
    method: 'POST',
    url: 'https://bandcamp.com/api/merchorders/3/get_orders',
    headers:
    {
      //'Postman-Token': 'd1dd9d93-188f-42f4-9c87-5123df24fe51',
      'cache-control': 'no-cache',
      Authorization: 'Bearer ' + access_token,
      'Content-Type': 'application/json'
    },
    body: { band_id: config.band_id, start_time: '2018-12-31' },
    json: true
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body); //works
    // var stuff = body;
    // var stuff2 = JSON.stringify(stuff); //just removes all spaces basically
    // var myArr = JSON.parse(stuff); expects a string, but it's already JSON
    // var stuff3 = body.items; //SAME DATA, with extra set of brackets since it was pushed
    // var data = [];
    // data.push(stuff3);
    // console.log(data);
    // console.log(body.items); //THE WAY TO GO

    //try and parse items by item_name and put into array, WORKS
    // sort items by name and create array of matching items
    var myArr = [];
    for (var i = 0; i < body.items.length; i++) {
      if (body.items[i].item_name === 'Druid Controller Shirt by Forming the Void')
        myArr.push(body.items[i]);
    };
    console.log(myArr);

    // send needed shipping info to printful-customer name, address1 and address2, city, state, country, zip
    // need to match BC item_name to printful store item ID 
    // send to printful API

  });
}); // end of original post (




