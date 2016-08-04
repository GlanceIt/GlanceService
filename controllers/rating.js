var express = require('express');
var router = express.Router();

/* PUT (update) user ratings for a spot and spot average ratings. */
router.put('/ratings/:spot', function(req, res) {
    var db = req.db;
    var body = req.body;
    var user = body.user;
    var spotIndex = req.params.spot;

    if (!body.ratings) {
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
                body.spot = spotIndex;
                updateRatingAndAvg(db, currRatings, body, res);
            }
        }
    });
});

function isRatingsValid(body) {
    var wifiRating = body.ratings.wifi;
    var staffRating = body.ratings.staff;
    var coffeeRating = body.ratings.coffee;
    var seatingRating = body.ratings.seating;
    var parkingRating = body.ratings.parking;
    var overallRating = body.ratings.overall;

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
    userCollection.findOne({userId:newRatings.user},{},function(err,users){
        if (err || !users) {
            console.log('Could not find user [' + newRatings.user + ']. Cannot post this rating.');
            return res.json({ result: 'Could not find user [' + newRatings.user + ']. Cannot post this rating.' });
        }

        console.log('Found user [' + newRatings.user + ']. Posting the review...');
        collection.update({spot: newRatings.spot, user: newRatings.user}, newRatings, {upsert: true}, function(err,docs){
            if (err) {
                console.log(err);
                console.log('Could not update rating in DB.');
                res.json({"result":"Could not update rating in DB."});
            } else {
                console.log("Inserted/updated ratings for spot [" + newRatings.spot + "] by user [" + newRatings.user + "]");
                updateSpotAvgRatings(db, currRatings, newRatings.spot, res);
            }
        });
    });
}

function updateSpotAvgRatings(db, currRatings, spot, res) {
    var collection = db.get('ratingcollection');
    collection.col.aggregate(
        [
            {$match: {"spot":spot}},{$group: { _id: "spot", avgWifi: {$avg: "$ratings.wifi"}, countWifi: {$sum: 1}, avgStaff: {$avg: "$ratings.staff"}, countStaff: {$sum: 1}, avgCoffee: {$avg: "$ratings.coffee"}, countCoffee: {$sum: 1}, avgSeating: {$avg: "$ratings.seating"}, countSeating: {$sum: 1}, avgParking: {$avg: "$ratings.parking"}, countParking: {$sum: 1}, avgOverall: {$avg: "$ratings.overall"}, countOverall: {$sum: 1} }}
        ],
        {}, function(err, newRatings){
            if (err) {
	        console.log('Could not get average ratings for spot');
	        res.json({ message: 'Could not get average ratings for spot' });
	    } else {
                var ratings = currRatings;
                ratings.aspects.wifi.rating = newRatings[0].avgWifi;
                ratings.aspects.wifi.count = newRatings[0].countWifi;
                ratings.aspects.staff.rating = newRatings[0].avgStaff;
                ratings.aspects.staff.count = newRatings[0].countStaff;
                ratings.aspects.coffee.rating = newRatings[0].avgCoffee;
                ratings.aspects.coffee.count = newRatings[0].countCoffee;
                ratings.aspects.seating.rating = newRatings[0].avgSeating;
                ratings.aspects.seating.count = newRatings[0].countSeating;
                ratings.aspects.parking.rating = newRatings[0].avgParking;
                ratings.aspects.parking.count = newRatings[0].countParking;
                ratings.overall.rating = newRatings[0].avgOverall;
                ratings.overall.count = newRatings[0].countOverall;

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
