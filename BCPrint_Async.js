const fs = require('fs');
const request = require('request-promise');
const util = require('util');
const config = require('./config');
const PrintfulClient = require('./printfulclient.js');
const printfulKey = config.printfulKey;

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

async function handler() {
    let res
    //Try/Catch to obtain valid tokens
    try {
        //Read existing tokens from file
        let data = await readFile('tokenData.json', 'utf8');

        //Send tokens to getNewTokens and await the request's response from Bandcamp that contains the new tokens
        res = await request(getNewTokens(data));

        //Write the new tokens to a file 
        await writeFile('tokenData.json', res);

    } catch (err) {
        //console.log(err);
        console.log("something went wrong");
        //If here, either there was no token in the file or the token had errors. So use client id and secret to get new set of tokens.

        try{
            //Use client id and secret to obtain new set of tokens
            let options = {
                method: 'POST',
                url: 'https://bandcamp.com/oauth_token',
                form: {
                    'grant_type': 'client_credentials',
                    client_id: config.client_id,
                    client_secret: config.client_secret
                }
            };

            let newTokenData = await request(options);

            //Store new token data in file
            await writeFile('tokenData.json', newTokenData);

            //Restart handler
            handler();
 
        } catch(err){
            console.log(err);
            console.log("Something went wrong trying to get new set of tokens.");
        }

    }
    //Now that tokens are settled, use one to get orders from bandcamp
    try {
        //Get previous sale ids
        let rawSales = await readFile('saleIds.json', 'utf8');

        //let previousSales = JSON.stringify(rawSales);
        let previousSales = JSON.parse(rawSales);

        let body = await request(getBandcampOrders(res));

        //FilterOrders: attach corresponding printful IDs to relavent orders, returns array
        let printfulArray = filterOrders(body.items);

        try {
            //Compare past orders with current orders by id, return array with items to be ordered.
            let toBeOrdered = compare([printfulArray, previousSales]);

            //Order items and return array of successful orders
            let OrderedItems = await callPrintful(toBeOrdered);

            //Store both previous sales and new sales items in file
            let storeThis = storeSaleIds(OrderedItems, previousSales);
            await writeFile('saleIds.json', storeThis);

        } catch (err) {
            console.log(err);
            console.log("No new items to order!");
        }

    } catch (err) {
        console.log(err);
        console.log("error!");
    }
};

handler();

//Passed refresh token, inserts it into options. Returns options to be used to get new access token.
function getNewTokens(res) {
    let json = JSON.parse(res);
    let refreshToken = json.refresh_token;

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
    return options;
};

//Passed token json, returns options to be used to get orders from bandcamp. 
function getBandcampOrders(res) {
    let json = JSON.parse(res);
    let access_token = json.access_token;
    //console.log(access_token);

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
    return options;
}

//Based orders array, filters through items, attaches corresponding Printful IDs, returns array of items to be ordered from Printful.
function filterOrders(allOrders) {
    let printfulOrders = [];

    for (var i = 0; i < allOrders.length; i++) {

        if (allOrders[i].item_name === 'The More You Void Shirt (Black) by Forming the Void') {
            switch (allOrders[i].option) {
                case "small":
                    allOrders[i].variant_id = '189081623';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "medium":
                    allOrders[i].variant_id = '189081626';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "large":
                    allOrders[i].variant_id = '189081629';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "xl":
                    allOrders[i].variant_id = '189081632';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "2x":
                    allOrders[i].variant_id = '189081635';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "3x":
                    allOrders[i].variant_id = '5c3faf02b09df1';
                    printfulOrders.push(allOrders[i]);
                    break;
                default:
                    console.log("Unusual shirt size unaccounted for");
            }
        } else if (allOrders[i].item_name === 'The More You Void Shirt (Grey) by Forming the Void') {
            switch (allOrders[i].option) {
                case "small":
                    allOrders[i].variant_id = '184479802';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "medium":
                    allOrders[i].variant_id = '184479805';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "large":
                    allOrders[i].variant_id = '184479808';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "xl":
                    allOrders[i].variant_id = '5c5ca089f2ce44';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "2x":
                    allOrders[i].variant_id = '184479814';
                    printfulOrders.push(allOrders[i]);
                    break;
                case "3x":
                    allOrders[i].variant_id = '5c3fafcce44b73';
                    printfulOrders.push(allOrders[i]);
                    break;
                default:
                    console.log("Unusual shirt size unaccounted for");
            }
        }
    };
    //console.log(printfulOrders);
    return printfulOrders;
}

//Compares current items to be ordered from Printful, with previously ordered items, by sale id. 
//Removing Previously orderd items to ensure no duplicate orders. Returns array of items to be ordered.
function compare([printfulArray, previousSales]) {
    for (var i = 0; i < previousSales.length; i++) {

        for (var j = 0; j < printfulArray.length; j++) {
            if (previousSales[i] == printfulArray[j].sale_item_id) {
                console.log("Splice item");
                printfulArray.splice(j, 1);
                //break;
            }
        }
    }

    if (printfulArray.length > 0) {
        return (printfulArray);
    } else {
        console.log("No items to be ordered left in array");
        return;
    }
};

//Gets array of items to be ordered from Printful, orders them, returns array of successfully ordered items.
function callPrintful(items) {
    var myArr = [];
    myArr = items;

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
    return myArr;
}

//Gets array of items that were just ordered from Printful, and array of previously ordered items and stores them in a single json string.
function storeSaleIds(items, previousSales) {
    let saleIds = [];

    items.forEach(element => {
        saleIds.push(element.sale_item_id);
    });

    previousSales.forEach(element => {
        saleIds.push(element);
    })

    let saleIdString = JSON.stringify(saleIds);
    return saleIdString;
};