var express = require('express'),
    mongodb = require('mongodb'),
    bodyParser = require('body-parser'),
    path = require('path'),
    assert = require('assert'),
    mongoClient = mongodb.MongoClient,
    app = express();

app.use(bodyParser.urlencoded({ extended: true }));

//mongodb://<dbuser>:<dbpassword>@ds055802.mongolab.com:55802/hit_counter
var mongoURI = 'mongodb://brianlam:hit_counter@ds055802.mongolab.com:55802/hit_counter';

app.get('/', function (req, res) {
    res.send('Hello, World!');
});

app.get('/initialize-url', function (req, res) {
    res.sendFile(path.join(__dirname, './views', 'initialize-url.html'));
});

// Initialize URL and count to 0
app.post('/post-initialize-url', function (req, res) {
    mongoClient.connect(mongoURI, function (err, db) {
        initializeURL (db, req.body.url,
            function () {
                res.send("Success");
            },
            function () {
                res.send ("Record already existed");
            });
    });
});

app.get('/get-hit-count', function (req, res) {
    mongoClient.connect(mongoURI, function (err, db) {
        accessHits(db, req.body.url,
            function (hitCount) {
                res.send (req.body.url + " " + hitCount);
            },
            function () {
                res.send (req.body.url + " does not match any existing record.");
            });
    });
});

app.get('/increment-count', function (req, res) {
    mongoClient.connect(mongoURI, function (err, db) {
        accessHits(db, req.query.url,
            function (hitCount) {
                res.send (req.query.url + ": " + hitCount);
            },
            function () {
                res.send (req.query.url + "does not match any existing record.");
            }, true);
    });
});

var accessHits = function (db, url, success, fail, shouldIncrement) {
   var pageCollection = db.collection('page');
   console.log ('Accessing hit count of url: ', url);
   pageCollection.findAndModify(
           {url: url},
           null, 
           {$inc: {hits: (shouldIncrement) ? 1 : 0 }},
           {new:true},
           function (err, doc) {
               if (!err) {
                   obj = doc.value;
                   success(obj.hits);
               }
           });
};

// TODO add heroku processing port here
var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});

var initializeURL = function (db, url, success, fail) {
    console.log ("Attempting to initialize URL: ", url);
    var pageCollection = db.collection('page');
    pageCollection.find({url: url}).count(function (err, count) {
        if (!err) {
            if (count == 0) {
                console.log ('No present record found. Going to insert.');
                pageCollection.insertOne({
                    url: url,
                    hits:0
                }).then(function(r) {
                    console.log("Inserted record with url: ", url);
                    assert.equals(r.insertedCount, 1);
                });
                success();
            } else {
                console.log ('Present record found. Not going to insert.');
                fail();
            }
        }
    });
};
