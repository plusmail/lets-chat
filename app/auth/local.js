'use strict';

const mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;

class Local{
    key = 'local';
    constructor(options) {
        this.options = options;
        this.key = 'local';
    }


    setup() {
        passport.use(new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password'
        }, function(identifier, password, done) {
            let User = mongoose.model('User');
            User.authenticate(identifier, password, function(err, user) {
                if (err) {
                    return done(null, false, {
                        message: 'Some fields did not validate.'
                    });
                }
                if (user) {
                    return done(null, user);
                } else {
                    return done(null, null, {
                        message: 'Incorrect login credentials.'
                    });
                }
            });
        }));
    };

    authenticate(req, cb) {
        passport.authenticate('local', cb)(req);
    };
}


// function Local(options) {
//     this.options = options;
//     this.key = 'local';
// }

// Local.key = 'local';
//
// Local.prototype.setup = function() {
//     passport.use(new LocalStrategy({
//         usernameField: 'username',
//         passwordField: 'password'
//     }, function(identifier, password, done) {
//         let User = mongoose.model('User');
//         User.authenticate(identifier, password, function(err, user) {
//             if (err) {
//                 return done(null, false, {
//                     message: 'Some fields did not validate.'
//                 });
//             }
//             if (user) {
//                 return done(null, user);
//             } else {
//                 return done(null, null, {
//                     message: 'Incorrect login credentials.'
//                 });
//             }
//         });
//     }));
// };
//
// Local.prototype.authenticate = function(req, cb) {
//     passport.authenticate('local', cb)(req);
// };

module.exports = Local;
