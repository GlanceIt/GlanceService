var express = require('express');
var router = express.Router();
var geocoder = require('node-geocoder').getGeocoder('google', 'http');

/* POST returns spots sorted by weighted sum of ratings */
router.post('/search', function(req, res) {
    var db = req.db;
    var reqBody = req.body;
    var weights = null;
    // default number of results to 100
    var MAX_NUMBER_OF_RESULTS = 100;
    var numOfResults = MAX_NUMBER_OF_RESULTS;
    var inputWeights = null;

    // Defaulting weights to 1 in case no weight is provided in the request
    var weights = {
        wifi: 1,
        staff: 1,
        coffee: 1,
        seating: 1,
        parking: 1
    };

    // Default location
    var currLoc = '38 Prism Irvine CA';

    if (reqBody != null) {
        inputWeights = reqBody.weights;
        var inputLoc = reqBody.location;
        if (inputLoc != null) {
           currLoc = inputLoc;
        }
        var inputNumOfResults = reqBody.numOfResults;
        if (inputNumOfResults != null && inputNumOfResults <= MAX_NUMBER_OF_RESULTS) {
           numOfResults = reqBody.numOfResults;
        }
    }

    console.log('current loc: ' + currLoc);

    if (inputWeights != null) {
	if (inputWeights.wifi) {
            weights.wifi = inputWeights.wifi;
        }

	if (inputWeights.staff) {
            weights.staff = inputWeights.staff;
        }

	if (inputWeights.coffee) {
            weights.coffee = inputWeights.coffee;
        }

	if (inputWeights.seating) {
            weights.seating = inputWeights.seating;
        }

	if (inputWeights.parking) {
            weights.parking = inputWeights.parking;
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
                        { $multiply: [ "$aspects.wifi.rating", weights.wifi ] },
                        { $multiply: [ "$aspects.staff.rating", weights.staff ] },
                        { $multiply: [ "$aspects.coffee.rating", weights.coffee ] },
                        { $multiply: [ "$aspects.seating.rating", weights.seating ] },
                        { $multiply: [ "$aspects.parking.rating", weights.parking ] }
                    ]
                }
            }},
            {$sort: { "weight": -1 } },
            {$limit: numOfResults}
        ],
        { allowDiskUse: true },
	function(err, searchResults){
            if (err) {
                console.log('Searching spots failed.');
                res.json({ message: 'Searching spots failed.' });
            } else {
                var spots = [];
                var results = {
                    spots: spots,
                    weights: weights
                }
                for (var i = 0; i < searchResults.length; i++) {
                    spots[i] = searchResults[i].spot;
                    spots[i].weight = searchResults[i].weight;
                }
                results.spots = spots;
                res.json(results);
            }
        }
    );
    });

});

module.exports = router;
