var express = require('express');
var router = express.Router();

router.put('/users/:user', function(req, res) {
    var collection = req.db.get('usercollection');
    var body = req.body;
    var userId = req.params.user;
    var firstName = body.FirstName;
    var lastName = body.LastName;
    var email = body.Email;

    if (!isUserValid(userId, firstName, lastName)) {
        return res.json({result: "Invalid user. Cannot create/update user."});
    }

    var newUser = body;
    newUser.UserId = userId;
    insertOrUpdateUser(collection, newUser, res);
});

router.post('/users', function(req, res) {
    var collection = req.db.get('usercollection');
    var body = req.body;
    var userId = body.UserId;
    var firstName = body.FirstName;
    var lastName = body.LastName;
    var email = body.Email;

    if (!isUserValid(userId, firstName, lastName)) {
        return res.json({result: "Invalid user. Cannot create/update user."});
    }

    var newUser = body;
    insertOrUpdateUser(collection, newUser, res);
});

function isUserValid(userId, firstName, lastName) {
    if (userId && firstName && lastName) {
        return true;
    }
    return false;
}

function insertOrUpdateUser(collection, newUser, res) {
    collection.update({UserId:newUser.UserId}, newUser, {upsert:true}, function(err,docs){
        if (err) {
            console.log(err);
            console.log('Could not insert or update user with id [' + newUser.UserId + ']');
            res.json({ result: 'Could not insert or update user with id [' + newUser.UserId + ']' });
        } else {
            console.log("Inserted/updated user with id [" + newUser.UserId + "]");
            res.send(newUser);
        }
    });
}

module.exports = router;
