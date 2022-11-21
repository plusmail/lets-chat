//
// Require Login
//

'use strict';

const mongoose = require('mongoose');

module.exports = function(req, res, next) {
    let room = req.params.room;

    if (!room) {
        return res.sendStatus(404);
    }

    let Room = mongoose.model('Room');

    Room.findByIdOrSlug(room, function(err, room) {
        if (err) {
            return res.sendStatus(400);
        }

        if (!room) {
            return res.sendStatus(404);
        }

        let roomId = room._id.toString();

        req.params.room = roomId;
        req.body.room = roomId;
        req.query.room = roomId;

        next();
    });
};
