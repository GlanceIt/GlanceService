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
            return res.json({ message: 'Could not get nearby spots' });
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

router.put('/spots/:spot', function(req, res) {
    var body = req.body;
    var spotIndex = req.params.spot;
    var spotAddress = body.address;
    var spotStreet = spotAddress.Street;
    var spotCity = spotAddress.City;
    var spotState = spotAddress.State;
    var spotZip = spotAddress.Zip;

    if (!isSpotValid(spotIndex, spotAddress, spotStreet, spotCity, spotState, spotZip)) {
        return res.json({result: "Invalid name and/or address. Cannot update spot."});
    }

    var db = req.db;
    var collection = db.get('spotcollection');
    var spot = req.params.spot;
    collection.findOne({index: spot},{},function(err,spotDetails){
        if (err) {
            console.log('Could not find spot [' + spot + '] to update');
            res.json({ result: 'Could not find spot [' + spot + '] to update' });
        } else {
            console.log('Found [' + spotDetails.index + '] updating...');

            if (body.contacts) {
                spotDetails.contacts.phone = body.contacts.phone;
                spotDetails.contacts.facebook = body.contacts.facebook;
                spotDetails.contacts.twitter = body.contacts.twitter;
                spotDetails.contacts.instagram = body.contacts.instagram;
                spotDetails.contacts.website = body.contacts.website;
            }

            var spotLoc = spotStreet + ", " + spotCity + ", " + spotState + ", " + spotZip;
            geocoder.geocode(spotLoc, function(err, geoLoc) {
                if (err) {
                    console.log('The provided address (' + spotLoc + ') was not valid. Update failed!');
                    res.json({ result: 'The provided address was not valid. Update failed.'});
                } else {
                    spotDetails.Location.coordinates = [geoLoc[0].longitude, geoLoc[0].latitude];
                    spotDetails.address.Street = spotStreet;
                    spotDetails.address.City = spotCity;
                    spotDetails.address.State = spotState;
                    spotDetails.address.Zip = spotZip;
                    insertOrUpdateSpot(collection, spotDetails, res);
                }
            });
        }
    });
});

router.post('/spots', function(req, res) {
    var body = req.body;
    var spotName = body.name;
    var spotAddress = body.address;
    var spotStreet = spotAddress.street;
    var spotCity = spotAddress.city;
    var spotState = spotAddress.state;
    var spotZip = spotAddress.zip;

    if (!isSpotValid(spotName, spotAddress, spotStreet, spotCity, spotState, spotZip)) {
        return res.json({result: "Invalid name and/or address. Cannot create new spot."});
    }

    var spotPhone = "";
    var spotFacebook = "";
    var spotTwitter = "";
    var spotInstagram = "";
    var spotWebsite = "";

    if (body.contacts) {
        spotPhone = body.contacts.phone;
        spotFacebook = body.contacts.facebook;
        spotTwitter = body.contacts.twitter;
        spotInstagram = body.contacts.instagram;
        spotWebsite = body.contacts.website;
    }

    var spotLoc = spotStreet + ", " + spotCity + ", " + spotState + ", " + spotZip;

    var emptyRating = {"rating":0,"count":0};
    var spotAspects = {"wifi": emptyRating, "staff": emptyRating, "coffee": emptyRating, "seating": emptyRating, "parking": emptyRating};

    geocoder.geocode(spotLoc, function(err, geoLoc) {
        var spotLongitude = geoLoc[0].longitude;
        var spotLatitude = geoLoc[0].latitude;

        var collection = req.db.get('spotcollection');
        var spotIndexPrefix = spotName + "-" + spotCity + "-";
        collection.count({index: {$regex: new RegExp (spotIndexPrefix + "*")}}, function(err,docs){
            var currentCount = docs + 1;
            var spotIndex = spotIndexPrefix + currentCount;

        var newSpot = {"index": spotIndex, "name": spotName, "overall": emptyRating,
                "aspects": spotAspects, "address": {"street": spotStreet, "city": spotCity, "state": spotState, "zip": spotZip},
                "image": "",
                "location":{"type":"Point","coordinates":[spotLongitude,spotLatitude]},
                "contacts":{"phone":spotPhone, "facebook":spotFacebook, "twitter":spotTwitter, "instagram":spotInstagram, "website":spotWebsite}
            };
            insertOrUpdateSpot(collection, newSpot, res);
        });

    });
});

function isSpotValid(spotName, spotAddress, spotStreet, spotCity, spotState, spotZip) {
    if (spotName && spotAddress && spotStreet && spotCity && spotState && spotZip) {
        return true;
    }
    return false;
}

function insertOrUpdateSpot(collection, newSpot, res) {
    collection.update({index:newSpot.index}, newSpot, {upsert:true}, function(err,docs){
        if (err) {
            console.log('Could not insert or update spot with index [' + newSpot.index + ']');
            res.json({ result: 'Could not insert or update spot with index [' + newSpot.index + ']' });
        } else {
            console.log("Inserted/updated spot: [" + newSpot.name + "] with index [" + newSpot.index + "]");
            res.send(newSpot);
        }
   });
}

module.exports = router;
