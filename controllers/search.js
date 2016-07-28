var express = require('express');
var router = express.Router();

/* POST returns spots sorted by weighted sum of ratings */
router.post('/search', function(req, res) {
    var db = req.db;

    // Defaulting weights to 1 in case no weight is provided in the request
    var wifiWeight = 1;
    var staffWeight = 1;
    var coffeeWeight = 1;
    var seatingWeight = 1;
    var parkingWeight = 1;

    var weights = req.body;
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

    var collection = db.get('spotcollection');
    collection.col.aggregate(
        [
            { "$project": {
                "spot": "$$ROOT",
                "weight": {
                    "$add": [
                        { "$multiply": [ "$aspects.Wifi.rating", wifiWeight ] },
                        { "$multiply": [ "$aspects.Staff.rating", staffWeight] },
                        { "$multiply": [ "$aspects.Coffee.rating", coffeeWeight ] },
                        { "$multiply": [ "$aspects.Seating.rating", seatingWeight ] },
                        { "$multiply": [ "$aspects.Parking.rating", parkingWeight ] }
                    ]
                }
            }},
            { "$sort": { "weight": -1 } }
        ],
        { "allowDiskUse": true },
	function(err, searchResults){
            if (err) {
                console.log('Searching spots failed.');
                res.json({ message: 'Searching spots failed.' });
            } else {
                var results = [];
                for (var i = 0; i < searchResults.length; i++) {
                    results[i] = searchResults[i].spot;
                    //results[i].weight = searchResults[i].weight;
                }
                res.json(results);
            }
        }
    );
});

module.exports = router;
