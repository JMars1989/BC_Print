/**
 * Get new Atoken and Rtoken from bandcamp and store in db.
 */

var mysql = require('mysql');
var request = require('request');

var config = require('./config');

// connect to DB
var con = mysql.createConnection({
    host: "localhost",
    user: config.user,
    password: config.pass,
    database: config.database
});

// Uses client id and secret to get access token and refresh token from bandcamp. 
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
        console.log("There was an error.");

    //parses the json into obj
    var json = JSON.parse(response.body);
    var access_token = json.access_token;
    var refresh_token = json.refresh_token;
    console.log(access_token);
    console.log(refresh_token);
    console.log(json);

    //Store tokens in db here
    con.connect(function (err) {
        if (err) throw err;
        console.log("connected!");

        var sql = `UPDATE tokens SET atoken = '${access_token}'`;
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("Access Token inserted!");
        })

        var sql2 = `UPDATE tokens SET rtoken = '${refresh_token}'`;
        con.query(sql2, function (err, result) {
            if (err) throw err;
            console.log("Refresh Token inserted!");
        })
        //close db connection
        con.end();
    })
});





