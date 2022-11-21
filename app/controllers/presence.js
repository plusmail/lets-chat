'use strict';

const util = require('util');
const Connection = require('./../core/presence/connection');

class SocketIoConnection extends Connection{
    constructor(user, socket) {
        super('socket.io', user);
        this.socket = socket;
        socket.conn = this;
        socket.on('disconnect', this.disconnect.bind(this));
    }

    disconnect() {
        this.emit('disconnect');

        this.socket.conn = null;
        this.socket = null;
    };
}
//
// function SocketIoConnection(user, socket) {
//     const connect = new Connection(this, 'socket.io', user);
//     this.socket = socket;
//     socket.conn = this;
//     socket.on('disconnect', this.disconnect.bind(this));
// }
//
// util.inherits(SocketIoConnection, Connection);
//
// SocketIoConnection.prototype.disconnect = function() {
//     this.emit('disconnect');
//
//     this.socket.conn = null;
//     this.socket = null;
// };

module.exports = function() {
    let app = this.app,
        core = this.core,
        User = this.models.user;

    app.io.on('connection', function(socket) {
        let userId = socket.request.user._id;
        User.findById(userId, function (err, user) {
            if (err) {
                console.error(err);
                return;
            }
            let conn = new SocketIoConnection(user, socket);
            core.presence.connect(conn);
        });
    });
};
