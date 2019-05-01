
//BANDCAMP AUTH TOKEN AND PRINTFUL ORDER ALL IN ONE

var request = require('request');
var access_token;
var refreshToken;

var config = require('./config');

//need to test refresh token

//adds prinful
var PrintfulClient = require('./printfulclient.js');
var printfulKey = config.printfulKey;

//Bandcamp code here

request.post({
    url: 'https://bandcamp.com/oauth_token',
    oauth: {
    },
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
        body: { band_id: config.band_id, start_time: '2017-10-31' },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        //console.log(body); //works
        //var stuff = body;
        //var stuff2 = JSON.stringify(stuff); //just removes all spaces basically
        //var myArr = JSON.parse(stuff); expects a string, but it's already JSON
        // var stuff3 = body.items; //SAME DATA, with extra set of brackets since it was pushed
        // var data = [];
        // data.push(stuff3);
        // console.log(data);
        // console.log(body.items); //THE WAY TO GO


        //try and parse items by item_name and put into array, WORKS
        // sort items by name and create array of matching items
        // assign corresponding Prinful variant_id here
        // MUST KNOW SIZE OF SHIRT TO SET VARIANT ID
        var myArr = [];
        for (var i = 0; i < body.items.length; i++) {
            //BLACK TMYV SHIRT
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'small') {
                body.items[i].variant_id = '189081623';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'medium') {
                body.items[i].variant_id = '189081626';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'large') {
                body.items[i].variant_id = '189081629';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'xl') {
                body.items[i].variant_id = '189081632';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == '2x') {
                body.items[i].variant_id = '189081635';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == '3x') {
                body.items[i].variant_id = '5c3faf02b09df1';
                myArr.push(body.items[i]);
            }

            //GREY TMYV SHIRTS
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'small') {
                body.items[i].variant_id = '184479802';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'medium') {
                body.items[i].variant_id = '184479805';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'large') {
                body.items[i].variant_id = '184479808';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'xl') {
                body.items[i].variant_id = '5c5ca089f2ce44';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == '2x') {
                body.items[i].variant_id = '184479814';
                myArr.push(body.items[i]);
            }
            if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == '3x') {
                body.items[i].variant_id = '5c3fafcce44b73';
                myArr.push(body.items[i]);
            }
        };
        console.log(myArr);
        // DON"T NEED TO send needed shipping info to printful-customer name, address1 and address2, city, state, country, zip
        // send to printful API



        //printful native code starts///////////////////////////////////////////////////////////////
        /**
         * Callback for success
         * data - result element from the API response
         * info - additional data about the request and response
         */
        var ok_callback = function (data, info) {
            console.log('SUCCESS');
            console.log(data);
            //If response includes paging information, show total number available
            if (info.total_items) {
                console.log('Total items available: ' + info.total_items);
            }
        }

        /**
         * Callback for failure
         * data - error message
         * info - additional data about the request
         */
        var error_callback = function (message, info) {
            console.log('ERROR ' + message);
            //Dump raw response
            console.log(info.response_raw);
        }

        ///Construct client
        var pf = new PrintfulClient(printfulKey);

        // step through array to make orders
        // "external_variant_id": to make orders
                for(var i = 0; i < myArr.length; i++){
        
                    pf.post('orders',
                    {
                        recipient: {
                            name: myArr[i].ship_to_name,
                            address1: myArr[i].ship_to_street,
                            city: myArr[i].ship_to_city,
                            state_code: myArr[i].ship_to_state,
                            country_code: myArr[i].ship_to_country_code,
                            zip: myArr[i].ship_to_zip
                        },
                        items: [
                            {
                                external_variant_id: myArr[i].variant_id, 
                                name: myArr[i].item_name, //Display name
                               // retail_price: '19.99', //Retail price for packing slip
                                quantity: 1,
                               /* files: [
                                    {url: 'http://example.com/files/posters/poster_1.jpg'}
                                ]*/

                            }
                        ]
                    }
                ).success(ok_callback).error(error_callback);
       
               } // end of for loop
        
                //end printful native code
   
    });
});

