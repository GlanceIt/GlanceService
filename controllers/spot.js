var express = require('express');
var router = express.Router();
var geocoder = require('node-geocoder').getGeocoder('google', 'http');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ message: 'Glance Service!' });  
});

/* GET Spot list for the current location. */
router.get('/spotlist', function(req, res, next) {
    var db = req.db;
    var collection = db.get('spotcollection');

    // TODO: use the actual location of the user
    var currLoc = '38 Prism Irvine CA';
    geocoder.geocode(currLoc, function(err, result) {
        getNearbySpots(collection, result, res);
    });
});

/* GET Spot list for a city. */
router.get('/city/:city', function(req, res) {
    var db = req.db;
    var collection = db.get('spotcollection');
    var city = req.params.city;

    geocoder.geocode(city, function(err, cityLoc) {
        getNearbySpots(collection, cityLoc, res);
    });
});

function getNearbySpots(collection, result, res) {
    collection.col.aggregate(
        [
            {$geoNear: {near: {type: "Point", coordinates: [result[0].longitude, result[0].latitude]}, distanceField: "dist.calculated", num: 10, spherical: true}}
        ],
        {}, function(err, docs){
        if (err) {
	    console.log('Could not get nearby spots'); 
	    res.json({ message: 'Could not get nearby spots' });
	}
	res.json({"result": docs});
    });
}

/* GET Spot details. */
router.get('/spots/:spot', function(req, res) {
    var db = req.db;
    var collection = db.get('spotcollection');
    var spot = req.params.spot;
    collection.findOne({index: spot},{},function(err,docs){
        if (err) {
            console.log('Could not find spot ' + spot + ' in DB');
	    res.json({ result: 'Could not find spot ' + spot + ' in DB' });
	} else {
            console.log('found ' + docs.index + ' in DB');
            res.json({ "result": docs});
	}
        //res.json(docs);
    });
});

module.exports = router;
