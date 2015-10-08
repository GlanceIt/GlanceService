var express = require('express');
var router = express.Router();

/* PUT (update) user ratings for a spot and spot average ratings. */
router.put('/ratings/:spot', function(req, res) {
    var db = req.db;
    var body = req.body;
    var user = body.User;
    var spotIndex = req.params.spot;

    if (!body.Ratings) {
        res.json({result: "No rating is provided."});
    }

    collection = db.get('spotcollection');
    collection.findOne({index: spotIndex},{},function(err, currRatings){
        // Cannot rate a non-existing spot!
        if (err || !currRatings) {
            console.log('Could not find spot [' + spotIndex + '] in DB');
            res.json({ result: 'Could not find spot [' + spotIndex + '] in DB' });
        } else {
            if (!isRatingsValid(body)) {
                res.json({result: "Invalid rating. Cannot post new rating."});
            } else {
                console.log('Found spot [' + spotIndex + '] in DB');
                body.Spot = spotIndex;
                updateRatingAndAvg(db, currRatings, body, res);
            }
        }
    });
});

function isRatingsValid(body) {
    var wifiRating = body.Ratings.Wifi;
    var staffRating = body.Ratings.Staff;
    var coffeeRating = body.Ratings.Coffee;
    var seatingRating = body.Ratings.Seating;
    var parkingRating = body.Ratings.Parking;
    var overallRating = body.Ratings.Overall;

    if (isOneRatingValid(wifiRating) && isOneRatingValid(staffRating) && isOneRatingValid(coffeeRating) &&
        isOneRatingValid(seatingRating) && isOneRatingValid(parkingRating) && isOneRatingValid(overallRating)){
        return true;
    }
    return false;
}

function isOneRatingValid(rating) {
    if (parseInt(rating) != rating) {
        return false;
    }
    if ((rating || rating == 0) && rating >= 0 && rating <= 5) {
         return true;
    }
    console.log("rating: [" + rating + "] is not valid");
    return false;
}

/* Insert/update individual user ratings for a spot into the ratings collection
and update the average ratings in the spots collection.
Note: currRatings is only passed here to avoid accissing the spots collection again*/
function updateRatingAndAvg(db, currRatings, newRatings, res) {
    var collection = db.get('ratingcollection');
    var userCollection = db.get('usercollection');

    // return error if the user does not exist!
    userCollection.findOne({UserId:newRatings.User},{},function(err,users){
        if (err || !users) {
            console.log('Could not find user [' + newRatings.User + ']. Cannot post this rating.');
            return res.json({ result: 'Could not find user [' + newRatings.User + ']. Cannot post this rating.' });
        }

        console.log('Found user [' + newRatings.User + ']. Posting the review...');
        collection.update({Spot: newRatings.Spot, User: newRatings.User}, newRatings, {upsert: true}, function(err,docs){
            if (err) {
                console.log(err);
                console.log('Could not update rating in DB.');
                res.json({"result":"Could not update rating in DB."});
            } else {
                console.log("Inserted/updated ratings for spot [" + newRatings.Spot + "] by user [" + newRatings.User + "]");
                updateSpotAvgRatings(db, currRatings, newRatings.Spot, res);
            }
        });
    });
}

function updateSpotAvgRatings(db, currRatings, spot, res) {
    var collection = db.get('ratingcollection');
    collection.col.aggregate(
        [
            {$match: {"Spot":spot}},{$group: { _id: "Spot", avgWifi: {$avg: "$Ratings.Wifi"}, countWifi: {$sum: 1}, avgStaff: {$avg: "$Ratings.Staff"}, countStaff: {$sum: 1}, avgCoffee: {$avg: "$Ratings.Coffee"}, countCoffee: {$sum: 1}, avgSeating: {$avg: "$Ratings.Seating"}, countSeating: {$sum: 1}, avgParking: {$avg: "$Ratings.Parking"}, countParking: {$sum: 1}, avgOverall: {$avg: "$Ratings.Overall"}, countOverall: {$sum: 1} }}
        ],
        {}, function(err, newRatings){
            if (err) {
	        console.log('Could not get average ratings for spot');
	        res.json({ message: 'Could not get average ratings for spot' });
	    } else {
                var ratings = currRatings;
                ratings.aspects.Wifi.rating = newRatings[0].avgWifi;
                ratings.aspects.Wifi.count = newRatings[0].countWifi;
                ratings.aspects.Staff.rating = newRatings[0].avgStaff;
                ratings.aspects.Staff.count = newRatings[0].countStaff;
                ratings.aspects.Coffee.rating = newRatings[0].avgCoffee;
                ratings.aspects.Coffee.count = newRatings[0].countCoffee;
                ratings.aspects.Seating.rating = newRatings[0].avgSeating;
                ratings.aspects.Seating.count = newRatings[0].countSeating;
                ratings.aspects.Parking.rating = newRatings[0].avgParking;
                ratings.aspects.Parking.count = newRatings[0].countParking;
                ratings.Overall.rating = newRatings[0].avgOverall;
                ratings.Overall.count = newRatings[0].countOverall;

                collection = db.get('spotcollection');
                collection.col.update({index:ratings.index}, ratings, function(err,docs){
                    if (err) {
                        console.log(err);
                        console.log('Could not update average ratings for spot [' + ratings.index + ']');
                        res.json({ result: 'Could not update average ratings for spot [' + ratings.index + ']' });
                    } else {
                        console.log("Updated spot average ratings for [" + ratings.index + "]");
                        res.send(ratings);
                    }
                });
            }
        });
}

module.exports = router;
