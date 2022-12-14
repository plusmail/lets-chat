'use strict';

const mongoose = require('mongoose'),
    _ = require('lodash'),
    helpers = require('./helpers');

let getParticipants = function(room, options, cb) {
    if (!room.private || !options.participants) {
        return cb(null, []);
    }

    let participants = [];

    if (Array.isArray(options.participants)) {
        participants = options.participants;
    }

    if (typeof options.participants === 'string') {
        participants = options.participants.replace(/@/g, '')
            .split(',').map(function(username) {
                return username.trim();
            });
    }

    participants = _.chain(participants)
        .map(function(username) {
            return username && username.replace(/@,\s/g, '').trim();
        })
        .filter(function(username) { return !!username; })
        .uniq()
        .value();

    let User = mongoose.model('User');
    User.find({username: { $in: participants } }, cb);
};

class RoomManager {

    constructor(options) {
        this.core = options.core;
    }

    canJoin(options, cb) {
        let method = options.id ? 'get' : 'slug',
            roomId = options.id ? options.id : options.slug;

        this[method](roomId, function(err, room) {
            if (err) {
                return cb(err);
            }

            if (!room) {
                return cb();
            }

            room.canJoin(options, function(err, canJoin) {
                cb(err, room, canJoin);
            });
        });
    };

    create(options, cb) {
        let Room = mongoose.model('Room');
        Room.create(options, function(err, room) {
            if (err) {
                return cb(err);
            }

            if (cb) {
                room = room;
                cb(null, room);
                this.core.emit('rooms:new', room);
            }
        }.bind(this));
    };

    update(roomId, options, cb) {
        let Room = mongoose.model('Room');

        Room.findById(roomId, function(err, room) {
            if (err) {
                // Oh noes, a bad thing happened!
                console.error(err);
                return cb(err);
            }

            if (!room) {
                return cb('Room does not exist.');
            }

            if(room.private && !room.owner.equals(options.user.id)) {
                return cb('Only owner can change private room.');
            }

            getParticipants(room, options, function(err, participants) {
                if (err) {
                    // Oh noes, a bad thing happened!
                    console.error(err);
                    return cb(err);
                }

                room.name = options.name;
                // DO NOT UPDATE SLUG
                // room.slug = options.slug;
                room.description = options.description;

                if (room.private) {
                    room.password = options.password;
                    room.participants = participants;
                }

                room.save(function(err, room) {
                    if (err) {
                        console.error(err);
                        return cb(err);
                    }
                    room = room;
                    cb(null, room);
                    this.core.emit('rooms:update', room);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    archive(roomId, cb) {
        let Room = mongoose.model('Room');

        Room.findById(roomId, function(err, room) {
            if (err) {
                // Oh noes, a bad thing happened!
                console.error(err);
                return cb(err);
            }

            if (!room) {
                return cb('Room does not exist.');
            }

            room.archived = true;
            room.save(function(err, room) {
                if (err) {
                    console.error(err);
                    return cb(err);
                }
                cb(null, room);
                this.core.emit('rooms:archive', room);

            }.bind(this));
        }.bind(this));
    };

    list(options, cb) {
        options = options || {};

        options = helpers.sanitizeQuery(options, {
            defaults: {
                take: 500
            },
            maxTake: 5000
        });

        let Room = mongoose.model('Room');

        let find = Room.find({
            archived: { $ne: true },
            $or: [
                {private: {$exists: false}},
                {private: false},

                {owner: options.userId},

                {participants: options.userId},

                {password: {$exists: true, $ne: ''}}
            ]
        });

        if (options.skip) {
            find.skip(options.skip);
        }

        if (options.take) {
            find.limit(options.take);
        }

        if (options.sort) {
            let sort = options.sort.replace(',', ' ');
            find.sort(sort);
        } else {
            find.sort('-lastActive');
        }

        find.populate('participants');

        find.exec(function(err, rooms) {
            if (err) {
                return cb(err);
            }

            _.each(rooms, function(room) {
                this.sanitizeRoom(options, room);
            }.bind(this));

            if (options.users && !options.sort) {
                rooms = _.sortBy(rooms, ['userCount', 'lastActive'])
                    .reverse();
            }

            cb(null, rooms);

        }.bind(this));
    };

    sanitizeRoom(options, room) {
        let authorized = options.userId && room.isAuthorized(options.userId);

        if (options.users) {
            if (authorized) {
                room.users = this.core.presence
                    .getUsersForRoom(room.id.toString());
            } else {
                room.users = [];
            }
        }
    };

    findOne(options, cb) {
        let Room = mongoose.model('Room');
        Room.findOne(options.criteria)
            .populate('participants').exec(function(err, room) {

            if (err) {
                return cb(err);
            }

            this.sanitizeRoom(options, room);
            cb(err, room);

        }.bind(this));
    };

    get(options, cb) {
        let identifier;

        if (typeof options === 'string') {
            identifier = options;
            options = {};
            options.identifier = identifier;
        } else {
            identifier = options.identifier;
        }

        options.criteria = {
            _id: identifier,
            archived: { $ne: true }
        };

        this.findOne(options, cb);
    };

    slug(options, cb) {
        let identifier;

        if (typeof options === 'string') {
            identifier = options;
            options = {};
            options.identifier = identifier;
        } else {
            identifier = options.identifier;
        }

        options.criteria = {
            slug: identifier,
            archived: { $ne: true }
        };

        this.findOne(options, cb);
    };
}

// function RoomManager(options) {
//     this.core = options.core;
// }
//
// RoomManager.prototype.canJoin = function(options, cb) {
//     let method = options.id ? 'get' : 'slug',
//         roomId = options.id ? options.id : options.slug;
//
//     this[method](roomId, function(err, room) {
//         if (err) {
//             return cb(err);
//         }
//
//         if (!room) {
//             return cb();
//         }
//
//         room.canJoin(options, function(err, canJoin) {
//             cb(err, room, canJoin);
//         });
//     });
// };
//
// RoomManager.prototype.create = function(options, cb) {
//     let Room = mongoose.model('Room');
//     Room.create(options, function(err, room) {
//         if (err) {
//             return cb(err);
//         }
//
//         if (cb) {
//             room = room;
//             cb(null, room);
//             this.core.emit('rooms:new', room);
//         }
//     }.bind(this));
// };
//
// RoomManager.prototype.update = function(roomId, options, cb) {
//     let Room = mongoose.model('Room');
//
//     Room.findById(roomId, function(err, room) {
//         if (err) {
//             // Oh noes, a bad thing happened!
//             console.error(err);
//             return cb(err);
//         }
//
//         if (!room) {
//             return cb('Room does not exist.');
//         }
//
//         if(room.private && !room.owner.equals(options.user.id)) {
//             return cb('Only owner can change private room.');
//         }
//
//         getParticipants(room, options, function(err, participants) {
//             if (err) {
//                 // Oh noes, a bad thing happened!
//                 console.error(err);
//                 return cb(err);
//             }
//
//             room.name = options.name;
//             // DO NOT UPDATE SLUG
//             // room.slug = options.slug;
//             room.description = options.description;
//
//             if (room.private) {
//                 room.password = options.password;
//                 room.participants = participants;
//             }
//
//             room.save(function(err, room) {
//                 if (err) {
//                     console.error(err);
//                     return cb(err);
//                 }
//                 room = room;
//                 cb(null, room);
//                 this.core.emit('rooms:update', room);
//             }.bind(this));
//         }.bind(this));
//     }.bind(this));
// };
//
// RoomManager.prototype.archive = function(roomId, cb) {
//     let Room = mongoose.model('Room');
//
//     Room.findById(roomId, function(err, room) {
//         if (err) {
//             // Oh noes, a bad thing happened!
//             console.error(err);
//             return cb(err);
//         }
//
//         if (!room) {
//             return cb('Room does not exist.');
//         }
//
//         room.archived = true;
//         room.save(function(err, room) {
//             if (err) {
//                 console.error(err);
//                 return cb(err);
//             }
//             cb(null, room);
//             this.core.emit('rooms:archive', room);
//
//         }.bind(this));
//     }.bind(this));
// };
//
// RoomManager.prototype.list = function(options, cb) {
//     options = options || {};
//
//     options = helpers.sanitizeQuery(options, {
//         defaults: {
//             take: 500
//         },
//         maxTake: 5000
//     });
//
//     let Room = mongoose.model('Room');
//
//     let find = Room.find({
//         archived: { $ne: true },
//         $or: [
//             {private: {$exists: false}},
//             {private: false},
//
//             {owner: options.userId},
//
//             {participants: options.userId},
//
//             {password: {$exists: true, $ne: ''}}
//         ]
//     });
//
//     if (options.skip) {
//         find.skip(options.skip);
//     }
//
//     if (options.take) {
//         find.limit(options.take);
//     }
//
//     if (options.sort) {
//         let sort = options.sort.replace(',', ' ');
//         find.sort(sort);
//     } else {
//         find.sort('-lastActive');
//     }
//
//     find.populate('participants');
//
//     find.exec(function(err, rooms) {
//         if (err) {
//             return cb(err);
//         }
//
//         _.each(rooms, function(room) {
//             this.sanitizeRoom(options, room);
//         }.bind(this));
//
//         if (options.users && !options.sort) {
//             rooms = _.sortBy(rooms, ['userCount', 'lastActive'])
//                      .reverse();
//         }
//
//         cb(null, rooms);
//
//     }.bind(this));
// };
//
// RoomManager.prototype.sanitizeRoom = function(options, room) {
//     let authorized = options.userId && room.isAuthorized(options.userId);
//
//     if (options.users) {
//         if (authorized) {
//             room.users = this.core.presence
//                         .getUsersForRoom(room.id.toString());
//         } else {
//             room.users = [];
//         }
//     }
// };
//
// RoomManager.prototype.findOne = function(options, cb) {
//     let Room = mongoose.model('Room');
//     Room.findOne(options.criteria)
//         .populate('participants').exec(function(err, room) {
//
//         if (err) {
//             return cb(err);
//         }
//
//         this.sanitizeRoom(options, room);
//         cb(err, room);
//
//     }.bind(this));
// };
//
// RoomManager.prototype.get = function(options, cb) {
//     let identifier;
//
//     if (typeof options === 'string') {
//         identifier = options;
//         options = {};
//         options.identifier = identifier;
//     } else {
//         identifier = options.identifier;
//     }
//
//     options.criteria = {
//         _id: identifier,
//         archived: { $ne: true }
//     };
//
//     this.findOne(options, cb);
// };
//
// RoomManager.prototype.slug = function(options, cb) {
//     let identifier;
//
//     if (typeof options === 'string') {
//         identifier = options;
//         options = {};
//         options.identifier = identifier;
//     } else {
//         identifier = options.identifier;
//     }
//
//     options.criteria = {
//         slug: identifier,
//         archived: { $ne: true }
//     };
//
//     this.findOne(options, cb);
// };

module.exports = RoomManager;
