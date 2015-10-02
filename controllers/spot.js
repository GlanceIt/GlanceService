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
    geocoder.geocode(currLoc, function(err, geoLoc) {
        getNearbySpots(collection, geoLoc, res);
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

function getNearbySpots(collection, center, res) {
    collection.col.aggregate(
        [
            {$geoNear: {near: {type: "Point", coordinates: [center[0].longitude, center[0].latitude]}, distanceField: "dist.calculated", num: 10, spherical: true}}
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

router.post('/spots', function(req, res) {
    var body = req.body;
    var spotName = body.name;
    var spotAddress = body.address;
    var spotStreet = spotAddress.Street;
    var spotCity = spotAddress.City;
    var spotState = spotAddress.State;
    var spotZip = spotAddress.Zip;

    if (!isSpotValid(spotName, spotAddress, spotStreet, spotCity, spotState, spotZip)) {
    res.json({result: "Invalid name and/or address. Cannot create new spot."});
    }

    var spotPhone = "";
    var spotFacebook = "";
    var spotTwitter = "";
    var spotInstagram = "";
    var spotWebsite = "";

    if (body.Contacts) {
        spotPhone = body.Contacts.Phone;
        spotFacebook = body.Contacts.Facebook;
        spotTwitter = body.Contacts.Twitter;
        spotInstagram = body.Contacts.Instagram;
        spotWebsite = body.Contacts.Website;
    }

    var spotLoc = spotStreet + ", " + spotCity + ", " + spotState + ", " + spotZip;

    var emptyRating = {"rating":0,"count":0};
    var spotAspects = {"Wifi": emptyRating, "Staff": emptyRating, "Coffee": emptyRating, "Seating": emptyRating, "Parking": emptyRating};

    geocoder.geocode(spotLoc, function(err, geoLoc) {
        var spotLongitude = geoLoc[0].longitude;
        var spotLatitude = geoLoc[0].latitude;

        var collection = req.db.get('spotcollection');
        var spotIndexPrefix = spotName + "-" + spotCity + "-";
        collection.count({index: {$regex: new RegExp (spotIndexPrefix + "*")}}, function(err,docs){
            var currentCount = docs + 1;
            var spotIndex = spotIndexPrefix + currentCount;

        var newSpot = {"index": spotIndex, "name": spotName, "Overall": emptyRating,
                "aspects": spotAspects, "address": {"Street": spotStreet, "City": spotCity, "State": spotState, "Zip": spotZip},
                "Image": "",
                "Location":{"type":"Point","coordinates":[spotLongitude,spotLatitude]},
                "Contacts":{"Phone":spotPhone, "Facebook":spotFacebook, "Twitter":spotTwitter, "Instagram":spotInstagram, "Website":spotWebsite}
            };
            insertSpot(collection, newSpot, res);
        });

    });
});

function isSpotValid(spotName, spotAddress, spotStreet, spotCity, spotState, spotZip) {
    if (spotName && spotAddress && spotStreet && spotCity && spotState && spotZip) {
        return true;
    }
    return false;
}

function insertSpot(collection, newSpot, res) {
    collection.insert(newSpot, function(err,docs){
        if (err) {
            console.log('Could not insert new spot [' + newSpot.name + '] to DB. Most likely because a spot with the same index (' + newSpot.index + ') already exists!');
            res.json({ result: 'Could not insert spot [' + newSpot.name + '] with index [' + newSpot.index + '] to DB' });
        } else {
            console.log("Inserted new spot: [" + newSpot.name + "] with index [" + newSpot.index + "]");
            res.send(newSpot);
        }
   });
}

module.exports = router;
