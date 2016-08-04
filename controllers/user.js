var express = require('express');
var router = express.Router();

router.put('/users/:user', function(req, res) {
    var collection = req.db.get('usercollection');
    var body = req.body;
    var userId = req.params.user;
    var firstName = body.firstName;
    var lastName = body.lastName;
    var email = body.email;

    if (!isUserValid(userId, firstName, lastName)) {
        return res.json({result: "Invalid user. Cannot create/update user."});
    }

    var newUser = body;
    newUser.userId = userId;
    insertOrUpdateUser(collection, newUser, res);
});

router.post('/users', function(req, res) {
    var collection = req.db.get('usercollection');
    var body = req.body;
    var userId = body.userId;
    var firstName = body.firstName;
    var lastName = body.lastName;
    var email = body.email;

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
    collection.update({userId:newUser.userId}, newUser, {upsert:true}, function(err,docs){
        if (err) {
            console.log(err);
            console.log('Could not insert or update user with id [' + newUser.userId + ']');
            res.json({ result: 'Could not insert or update user with id [' + newUser.userId + ']' });
        } else {
            console.log("Inserted/updated user with id [" + newUser.userId + "]");
            res.send(newUser);
        }
    });
}

module.exports = router;
