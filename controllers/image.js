var express = require('express');
var router = express.Router();
var baseImageUrl = "https://s3-us-west-2.amazonaws.com/spot-images/"

/* GET all valid images for spot */
router.get('/images/spot/:spot', function(req, res) {
    var db = req.db;
    var collection = db.get('imagecollection');
    var spotIndex = req.params.spot;
    var tag = req.params.tag;
    collection.find({spot: spotIndex, valid: true},{},function(err,docs){
        if (err) {
            console.log('Could not find images for spot [' + spotIndex + ']');
            return res.json({ result: 'Could not find images for spot [' + spotIndex + ']'});
        }

        console.log('Found [' + docs.length + '] images for spot [' + spotIndex + ']');
        res.json({ "result": docs});
    });
});

/* GET valid images with specified tag for spot */
router.get('/images/spot/:spot/tag/:tag', function(req, res) {
    var db = req.db;
    var collection = db.get('imagecollection');
    var spotIndex = req.params.spot;
    var tag = req.params.tag;
    collection.find({spot: spotIndex, tag: tag, valid: true},{},function(err,docs){
        if (err) {
            console.log('Could not find images for spot [' + spotIndex + '] and tag [' + tag + ']');
            return res.json({ result: 'Could not find images for spot [' + spotIndex + '] and tag ' + tag + ']'});
        }

        console.log('Found [' + docs.length + '] images for spot [' + spotIndex + '] and tag [' + tag + ']');
        res.json({ "result": docs});
    });
});

module.exports = router;
