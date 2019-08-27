/**
 * Checks Bandcamp for shirt orders that we would use Printful to print and ship using Node JS. Bandcamp is a music streaming service and Printful is a print on demand service.
 * 
 * Read refresh token from local file to exchange for current set of access and refresh oauth tokens.
 * Store new tokens on local file and use token to check Bandcamp for any new unshipped shirts that should be ordered from Printful.
 * Order any applicable products from Printful
 * 
 * Since tokens expire after and hour, and the script is to only run once every 24 hours a new set of tokens is needed 
 * each time this runs.
 * 
 * Unique sales ids are created by bandcamp and stored in local db. New order sale ids are checked to verify order is not a duplicate.
 */

"use strict";

var request = require('request');
var config = require('./config');
var PrintfulClient = require('./printfulclient.js');
var printfulKey = config.printfulKey;

var fs = require('fs');

/*
Retreives previous Refresh token from file
*/
function getTokenFromDatabase() {
    return new Promise(function (resolve, reject) {

        var rawdata = fs.readFileSync('tokenData.json');
        var tokenData = JSON.parse(rawdata);
        console.log(tokenData.refresh_token);
        console.log(tokenData.access_token);
        resolve(tokenData.refresh_token);
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

            fs.writeFileSync('tokenData.json', response.body);

            var json = JSON.parse(response.body);
            var access_token = json.access_token;
            var refreshToken = json.refresh_token;

            var tokenArray = [];
            tokenArray.push(access_token);
            tokenArray.push(refreshToken);

            //for testing
            //console.log(access_token, refreshToken);

            resolve(tokenArray);
        });
    });
};


/*
Gets token array and uses access token to get orders from Bandcamp
Updates new tokens in file
Parses through Bandcamp orders for specific shirt orders that are to be ordered from Printful and assigns a variant ID to matching items so that Printful knows what to order.
*/
function StoreTokensAndGetOrders(tokenArray) {

    var access_token = tokenArray[0];
    //var refresh_token = tokenArray[1];

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
            //console.log(orders);
            resolve(orders);
        });
    });
}


/*
*If an item has previously been sold, it's unique sale_item_id will be in local file. Selects all sale ids in file.
*Passes bandcampOrders array through to the next function.
*/
function getPreviousSales(bandcampOrders) {
    return new Promise(function (resolve, reject) {
        var previousSalesJSON = [];

        var rawSales = fs.readFileSync('saleIds.json');
        var previousSalesJSON = JSON.parse(rawSales);


        console.log("Previous Sales ", previousSalesJSON);

        resolve([bandcampOrders, previousSalesJSON]);
    });
}


/*
Compare current orders in the printfulArray to old orders in sales. If item is present in sales, remove it. 
*/

function compare([printfulArray, sales]) {
    return new Promise(function (resolve, reject) {

        for (var i = sales.length - 1; i >= 0; --i) {
            for (var l = printfulArray.length - 1; l >= 0; --l) {
                if (printfulArray[l].sale_item_id == sales[i]) {
                    console.log("splice item ");
                    printfulArray.splice(l, 1);
                    break;
                }
            }
        }

        if (printfulArray.length > 0) {
            resolve(printfulArray);
        } else {
            reject("No new items");
        }
    });
}


/*
Gets array of items to order from Printful and orders them. Sends array on to next function.
*/

function callPrintful(newOrdersArray) {
    return new Promise(function (resolve, reject) {
        var ok_callback = function (data, info) {
            console.log('SUCCESS');
            console.log(data);

            //If response includes paging information, show total number available
            if (info.total_items) {
                console.log('Total items available: ' + info.total_items);
            }
        }

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
Gets orders array and stores each sale_item_id on file to ensure it's not ordered again later.
*/

function storeSaleIds(soldItemsArray) {
    var saleIds = [];

    soldItemsArray.forEach(element => {
        saleIds.push(element.sale_item_id);
    });

    var saleIdString = JSON.stringify(saleIds);
    console.log(saleIdString);

    fs.writeFileSync('saleIds.json', saleIdString);

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
