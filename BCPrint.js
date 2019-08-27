/**
 * Checks Bandcamp for shirt orders that we would use Printful to print and ship using Node JS. Bandcamp is a music streaming service and Printful is a print on demand service.
 * 
 * Read refresh token from local mysql db to exchange for current set of access and refresh oauth tokens.
 * Store new tokens on local db and use token to check Bandcamp for any new unshipped shirts that should be ordered from Printful.
 * Order any applicable products from Printful
 * 
 * Since tokens expire after and hour, and the script is to only run once every 24 hours a new set of tokens is needed 
 * each time this runs.
 * 
 * If local tokens are not valid, run storeTokenDB.js to use client secret to get new pair of bandcamp access and refresh tokens
 * 
 * Unique sales ids are created by bandcamp and stored in local db. New order sale ids are checked to verify order is not a duplicate.
 */

"use strict";

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

/*
Retreives previous Refresh token from database.
*/
function getTokenFromDatabase() {
    return new Promise(function (resolve, reject) {

        con.connect(function (err) {
            if (err) throw err;
            console.log("connected!");

            var sql = `SELECT RToken FROM tokens`;
            con.query(sql, function (err, result) {
                if (err) throw err;
                var string = JSON.stringify(result);
                var json = JSON.parse(string);
                var refresh_token = json[0].RToken;
                resolve(refresh_token);
            })
        });
    });
};

/*
Receives old refresh token and send to Bandcamp to exchange for new set of Access Token and Refresh Token inside tokenArray.
*/
function getNewTokensFromBandcamp(refreshToken) {
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
                refresh_token: `${refreshToken}`,
                undefined: undefined
            }
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            var json = JSON.parse(response.body);
            var access_token = json.access_token;
            var refreshToken = json.refresh_token;

            var tokenArray = [];
            tokenArray.push(access_token);
            tokenArray.push(refreshToken);

            //for testing
            console.log(access_token, refreshToken);
            resolve(tokenArray);
        });
    });
};

/*
Gets token array and uses access token to get orders from Bandcamp
Updates new tokens in database
Parses through Bandcamp orders for specific shirt orders that are to be ordered from Printful and assigns a variant ID to matching items so that Printful knows what to order.
*/
function StoreTokensAndGetOrders(tokenArray) {

    var access_token = tokenArray[0];
    var refresh_token = tokenArray[1];

    // Store new tokens in local database
    var sql = `UPDATE tokens SET atoken = '${access_token}'`;
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Access Token inserted!");
        console.log(result);
    })

    var sql2 = `UPDATE tokens SET rtoken = '${refresh_token}'`;
    con.query(sql2, function (err, result2) {
        if (err) throw err;
        console.log("Refresh Token inserted!");
        console.log(result2);
    })

    return new Promise(function (resolve, reject) {

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
            body: { band_id: config.band_id, start_time: '2019-01-31' },
            json: true
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            var orders = body.items;

            for (var i = 0; i < orders.length; i++) {

                if (orders[i].item_name === 'The More You Void Shirt (Black) by Forming the Void') {
                    switch (orders[i].option) {
                        case "small":
                            orders[i].variant_id = '189081623';
                            break;
                        case "medium":
                            orders[i].variant_id = '189081626';
                            break;
                        case "large":
                            orders[i].variant_id = '189081629';
                            break;
                        case "xl":
                            orders[i].variant_id = '189081632';
                            break;
                        case "2x":
                            orders[i].variant_id = '189081635';
                            break;
                        case "3x":
                            orders[i].variant_id = '5c3faf02b09df1';
                            break;
                        default:
                            console.log("Unusual shirt size unaccounted for");
                    }
                } else if (orders[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void') {
                    switch (orders[i].option) {
                        case "small":
                            orders[i].variant_id = '184479802';
                            break;
                        case "medium":
                            orders[i].variant_id = '184479805';
                            break;
                        case "large":
                            orders[i].variant_id = '184479808';
                            break;
                        case "xl":
                            orders[i].variant_id = '5c5ca089f2ce44';
                            break;
                        case "2x":
                            orders[i].variant_id = '184479814';
                            break;
                        case "3x":
                            orders[i].variant_id = '5c3fafcce44b73';
                            break;
                        default:
                            console.log("Unusual shirt size unaccounted for");
                    }
                }
            };
            resolve(orders);
        });
    });
}

/*
If an item has previously been sold, it's unique sale_item_id will be on the local database. Selects all from sale_item_id in database and parses into json.
Passes bandcampOrders array through to the next function.
*/
function getPreviousSales(bandcampOrders) {
    return new Promise(function (resolve, reject) {
        var previousSalesJSON = [];

        var sql = "SELECT * FROM `sale_ids`";
        con.query(sql, function (err, result) {
            if (err) throw err;

            var previousSalesstring = JSON.stringify(result);
            previousSalesJSON = JSON.parse(previousSalesstring);
            resolve([bandcampOrders, previousSalesJSON]);
        })
    });
}

/*
Compare current orders in the printfulArray to old orders in sales. If item is present in sales, remove it. 
*/
function compare([printfulArray, sales]) {
    return new Promise(function (resolve, reject) {

        for (var i = sales.length - 1; i >= 0; --i) {
            for (var l = printfulArray.length - 1; l >= 0; --l) {
                if (printfulArray[l].sale_item_id == sales[i].sale_item_id) {
                    console.log("splice item ");
                    printfulArray.splice(l, 1);
                    break;
                }
            }
        }

        if (printfulArray.length > 0) {
            resolve(printfulArray);
        } else {
            con.end();
            reject("No new items");
        }
    });
}

/*
Gets array of items to order from Printful and orders them. Sends array on to next function.
*/
function callPrintful(newOrdersArray) {
    return new Promise(function (resolve, reject) {

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
        // "external_variant_id" is how Printful tracks items
        for (var i = 0; i < newOrdersArray.length; i++) {
            pf.post('orders',
                {
                    recipient: {
                        name: newOrdersArray[i].ship_to_name,
                        address1: newOrdersArray[i].ship_to_street,
                        city: newOrdersArray[i].ship_to_city,
                        state_code: newOrdersArray[i].ship_to_state,
                        country_code: newOrdersArray[i].ship_to_country_code,
                        zip: newOrdersArray[i].ship_to_zip
                    },
                    items: [
                        {
                            external_variant_id: newOrdersArray[i].variant_id,
                            name: newOrdersArray[i].item_name,
                            quantity: 1,
                        }
                    ]
                }
            ).success(ok_callback).error(error_callback);
        }
        resolve(newOrdersArray);
    });

}

/*
Gets orders array and stores each sale_item_id in local database to ensure it's not ordered again later.
*/
function storeSaleIds(soldItemsArray) {
    var saleIds = [];
    var sql2 = '';

    // for (var k = 0; k < soldItemsArray.length; k++) {
    //     saleIds.push(soldItemsArray[k].sale_item_id);
    // }

    soldItemsArray.forEach(element => {
        saleIds.push(element.sale_item_id);
    });

    var salesIdObj = [];
    for (var v in saleIds) {
        salesIdObj.push([saleIds[v]]);
    }

    //does this return a result???
    sql2 = `INSERT INTO sale_ids VALUES ?`;
    con.query(sql2, [salesIdObj], function (err, result) {
        if (err) throw err;
        console.log("Sale_id inserted inside StoreSaleIds!");
        console.log(result);
    })

    //close db connection
    con.end();
}

getTokenFromDatabase()
    .then(function (refreshToken) {
        return getNewTokensFromBandcamp(refreshToken);
    })
    .then(function (tokenArray) {
        return StoreTokensAndGetOrders(tokenArray);
    })
    .then(function (ordersArray) {
        return getPreviousSales(ordersArray);
    })
    .then(function (obj) {
        return compare(obj);
    })
    .then(function (cleanedArray) {
        return callPrintful(cleanedArray);
    }).then(function (sales) {
        return storeSaleIds(sales);
    })
    .catch(error => console.log(error));