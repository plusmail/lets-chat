'use strict';

const mongoose = require('mongoose'),
    helpers = require('./helpers');

class UserManager{
    constructor(options) {
        this.core = options.core;
    }

    list(options, cb) {
        options = options || {};

        options = helpers.sanitizeQuery(options, {
            defaults: {
                take: 500
            },
            maxTake: 5000
        });

        let User = mongoose.model('User');

        let find = User.find();

        if (options.skip) {
            find.skip(options.skip);
        }

        if (options.take) {
            find.limit(options.take);
        }

        find.exec(cb);
    };

    get(identifier, cb) {
        let User = mongoose.model('User');
        User.findById(identifier, cb);
    };

    username(username, cb) {
        let User = mongoose.model('User');
        User.findOne({
            username: username
        }, cb);
    };

}

// function UserManager(options) {
//     this.core = options.core;
// }
//
// UserManager.prototype.list = function(options, cb) {
//     options = options || {};
//
//     options = helpers.sanitizeQuery(options, {
//         defaults: {
//             take: 500
//         },
//         maxTake: 5000
//     });
//
//     var User = mongoose.model('User');
//
//     var find = User.find();
//
//     if (options.skip) {
//         find.skip(options.skip);
//     }
//
//     if (options.take) {
//         find.limit(options.take);
//     }
//
//     find.exec(cb);
// };
//
// UserManager.prototype.get = function(identifier, cb) {
//     var User = mongoose.model('User');
//     User.findById(identifier, cb);
// };
//
// UserManager.prototype.username = function(username, cb) {
//     var User = mongoose.model('User');
//     User.findOne({
//         username: username
//     }, cb);
// };

module.exports = UserManager;
