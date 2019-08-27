/**
 * Read refresh token from local db to exchange for current set of access and refresh tokens.
 * Store new tokens on local db and use token to check Bandcamp for any new unshipped Printful products.
 * Order any applicable products from Printful
 * 
 * Since tokens expire after and hour, and the script it to only run once every 24 hours a new set of tokens is needed 
 * each time this runs.
 * 
 * If local tokens are not valid, run storeTokenDB.js
 */

var mysql = require('mysql');
var request = require('request');
var config = require('./config');
var PrintfulClient = require('./printfulclient.js');
var printfulKey = config.printfulKey;

var con = mysql.createConnection({
    host: "localhost",
    user: config.user,
    password: config.pass,
    database: config.database
});

function getTokenDB() {
    // get Rtoken from DB and resolve it
    return new Promise(function (resolve, reject) {

        con.connect(function (err) {
            if (err) throw err;
            console.log("connected!");

            var sql = `SELECT RToken FROM tokens`;
            con.query(sql, function (err, result) {
                if (err) throw err;

                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                // console.log("Rtoken: ", json[0].RToken); old token
                var refresh_token1 = json[0].RToken;
                resolve(refresh_token1);
            })
        });
    });
};

function tokenExchange(Rtoken) {
    //exchange Rtoken for new set of tokens from bandcamp
    return new Promise(function (resolve, reject) {
        var options = {
            method: 'POST',
            url: 'https://bandcamp.com/oauth_token',
            headers:
            {
                'cache-control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form:
            {
                grant_type: 'refresh_token',
                client_id: '211',
                client_secret: 'uYIOiB6Yv7MyNPbAZRHuQ4puooTu9qC5uzwpdmGjbpA=',
                refresh_token: `${Rtoken}`,
                undefined: undefined
            }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            // Parse tokens and export as array
            var json = JSON.parse(response.body);
            access_token = json.access_token;
            refreshToken = json.refresh_token;

            var tokenArray = [];
            tokenArray.push(access_token);
            tokenArray.push(refreshToken)

            //for testing
            console.log(access_token, refreshToken);
            resolve(tokenArray);
        });
    });
};


function BCOrdersStoreDB(array) {
    // Gets token array and uses Atoken to get orders FROM THE LAST 24 hours
    // Update new tokens to DB
    var result = array[0];
    var refresh_token3 = array[1];

    var sql = `UPDATE tokens SET atoken = '${result}'`;
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("AToken inserted!");
    })

    var sql2 = `UPDATE tokens SET rtoken = '${refresh_token3}'`;
    con.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("RToken inserted!");
    })

    // Get today to check for new orders
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getUTCMonth();
    var day = date.getUTCDate();
    var today = year + "-" + month + "-" + day;

    return new Promise(function (resolve, reject) {

        var access_token = result;
        //use token to get orders
        request;
        var options = {
            method: 'POST',
            url: 'https://bandcamp.com/api/merchorders/3/get_orders',
            headers:
            {
                'cache-control': 'no-cache',
                Authorization: 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            },
            body: { band_id: config.band_id, start_time: `${today}` },
            json: true
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            // sort items by name and create array of matching items
            var myArray = [];
            for (var i = 0; i < body.items.length; i++) {
                //BLACK TMYV SHIRT
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'small') {
                    body.items[i].variant_id = '189081623';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'medium') {
                    body.items[i].variant_id = '189081626';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'large') {
                    body.items[i].variant_id = '189081629';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == 'xl') {
                    body.items[i].variant_id = '189081632';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == '2x') {
                    body.items[i].variant_id = '189081635';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Black) by Forming the Void' && body.items[i].option == '3x') {
                    body.items[i].variant_id = '5c3faf02b09df1';
                    myArray.push(body.items[i]);
                }

                //GREY TMYV SHIRTS
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'small') {
                    body.items[i].variant_id = '184479802';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'medium') {
                    body.items[i].variant_id = '184479805';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'large') {
                    body.items[i].variant_id = '184479808';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == 'xl') {
                    body.items[i].variant_id = '5c5ca089f2ce44';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == '2x') {
                    body.items[i].variant_id = '184479814';
                    myArray.push(body.items[i]);
                }
                if (body.items[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void' && body.items[i].option == '3x') {
                    body.items[i].variant_id = '5c3fafcce44b73';
                    myArray.push(body.items[i]);
                }
            };
            resolve(myArray);
            // send needed shipping info to printful-customer name, address1 and address2, city, state, country, zip
            // need to match BC item_name to printful store item ID 
            // send to printful API
        });
    });
}

function callPrintful(items) {
    //close db connection
    con.end();

    //get printful items and order 
    return new Promise(function (resolve, reject) {

        var myArr = [];
        myArr = items;
        console.log(myArr)

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
        // Step through array to make orders
        // "external_variant_id" is how Printful tracks items
        for (var i = 0; i < myArr.length; i++) {
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
                            name: myArr[i].item_name,
                            quantity: 1,
                        }
                    ]
                }
            ).success(ok_callback).error(error_callback);
        }

    });
}

getTokenDB()
    .then(function (rtoken1) {
        return tokenExchange(rtoken1);
    })
    .then(function (result) {
        return BCOrdersStoreDB(result);
    })
    .then(function (array) {
        return callPrintful(array)
    })
    .catch(error => console.log(error));