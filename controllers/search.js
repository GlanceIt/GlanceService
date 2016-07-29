var express = require('express');
var router = express.Router();
var geocoder = require('node-geocoder').getGeocoder('google', 'http');

/* POST returns spots sorted by weighted sum of ratings */
router.post('/search', function(req, res) {
    var db = req.db;
    var reqBody = req.body;
    var weights = null;

    // Defaulting weights to 1 in case no weight is provided in the request
    var wifiWeight = 1;
    var staffWeight = 1;
    var coffeeWeight = 1;
    var seatingWeight = 1;
    var parkingWeight = 1;

    // Default location
    var currLoc = '38 Prism Irvine CA';

    if (reqBody != null) {
        weights = reqBody.weights;
        var inputLoc = reqBody.location;
        if (inputLoc != null) {
           currLoc = inputLoc;
        }
    }

    console.log('current loc: ' + currLoc);

    if (weights != null) {
	if (weights.wifiWeight) {
            wifiWeight = weights.wifiWeight;
        }

	if (weights.staffWeight) {
            staffWeight = weights.staffWeight;
        }

	if (weights.coffeeWeight) {
            coffeeWeight = weights.coffeeWeight;
        }

	if (weights.seatingWeight) {
            seatingWeight = weights.seatingWeight;
        }

	if (weights.parkingWeight) {
            parkingWeight = weights.parkingWeight;
        }
    }

    geocoder.geocode(currLoc, function(err, locCode) {

    var collection = db.get('spotcollection');
    collection.col.aggregate(
        [
            {$geoNear: {
                near: {
                    type: "Point",
                    coordinates: [locCode[0].longitude, locCode[0].latitude]
                },
                distanceField: "dist.calculated",
                num: 10000,
                spherical: true
            }},
            {$project: {
                spot: "$$ROOT",
                weight: {
                    $add: [
                        { $multiply: [ "$aspects.Wifi.rating", wifiWeight ] },
                        { $multiply: [ "$aspects.Staff.rating", staffWeight ] },
                        { $multiply: [ "$aspects.Coffee.rating", coffeeWeight ] },
                        { $multiply: [ "$aspects.Seating.rating", seatingWeight ] },
                        { $multiply: [ "$aspects.Parking.rating", parkingWeight ] }
                    ]
                }
            }},
            {$sort: { "weight": -1 } }
        ],
        { allowDiskUse: true },
	function(err, searchResults){
            if (err) {
                console.log('Searching spots failed.');
                res.json({ message: 'Searching spots failed.' });
            } else {
                var results = [];
                for (var i = 0; i < searchResults.length; i++) {
                    results[i] = searchResults[i].spot;
                    results[i].weight = searchResults[i].weight;
                }
                res.json(results);
            }
        }
    );
    });

});

module.exports = router;
