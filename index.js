var express = require('express'),
    mongodb = require('mongodb'),
    bodyParser = require('body-parser'),
    path = require('path'),
    assert = require('assert'),
    mongoClient = mongodb.MongoClient,
    ObjectID = mongodb.ObjectID,
    app = express();

app.use(bodyParser.urlencoded({ extended: true }));

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.use(allowCrossDomain);

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
            function (pageId) {
                console.log ("Sending success response.");
                res.send("Hit count associated with id: " + pageId);
            },
            function () {
                res.send ("Record already existed");
            });
    });
});

var getSuffix = function (hitCount) {
    hitCount = hitCount % 10;
    switch (hitCount) {
        case 1: return "st"; break;
        case 2: return "nd"; break;
        case 3: return "rd"; break;
        default: return "th"; break;
    }
}

app.get('/get-hit-count', function (req, res) {
    mongoClient.connect(mongoURI, function (err, db) {
        accessHits(db, req.query.pageId,
            function (hitCount) {
                res.json ({hits: hitCount, suffix: getSuffix(hitCount)});
            },
            function () {
                res.send (req.query.pageId + " does not match any existing record.");
            });
    });
});

app.get('/increment-count', function (req, res) {
    mongoClient.connect(mongoURI, function (err, db) {
        accessHits(db, req.query.pageId,
            function (hitCount) {
                res.json ({hits: hitCount, suffix: getSuffix(hitCount)});
            },
            function () {
                res.send (req.query.pageId + "does not match any existing record.");
            }, true);
    });
});

var accessHits = function (db, pageId, success, fail, shouldIncrement) {
   var pageCollection = db.collection('page');
   console.log ('Accessing hit count of record id: ', pageId);
   pageCollection.findAndModify(
           {_id: new ObjectID(pageId)},
           null, 
           {$inc: {hits: (shouldIncrement) ? 1 : 0 }},
           {new:true},
           function (err, doc) {
               console.log (doc);
               if (!err) {
                   obj = doc.value;
                   success(obj.hits);
               }
           });
};

// TODO add heroku processing port here
var server = app.listen(process.env.PORT || 3000, function() {
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
                    console.log("Inserted record with url: ", url, 'with record id: ', r.insertedId);
                    success(r.insertedId);
                });
            } else {
                console.log ('Present record found. Not going to insert.');
                fail();
            }
        }
    });
};
