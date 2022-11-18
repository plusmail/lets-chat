'use strict';

var util = require('util'),
    Connection = require('./../core/presence/connection'),
    settings = require('./../config');

class XmppConnection extends Connection{
    constructor(user, client, jid) {
        super();
        this.client = client;
        this._jid = jid;
        this.nicknames = {};
        client.conn = this;
        client.on('disconnect', this.disconnect.bind(this));
    }

    disconnect() {
        this.emit('disconnect');

        if (this.client) {
            this.client.conn = null;
            this.client = null;
        }
    };

    jid(room) {
        if (room) {
            return room + '@' + this.getConfDomain() +
                '/' + (this.nickname(room) || this._jid.local);
        }

        return this._jid.local + '@' + this.getDomain();
    };

    nickname(room, value) {
        if (value) {
            this.nicknames[room] = value;
        }
        return this.nicknames[room];
    };

    getDomain() {
        return this._jid.domain || settings.xmpp.domain;
    };

    getConfDomain() {
        return 'conference.' + this.getDomain();
    };

    getUserJid(username) {
        let domain = this.getDomain();

        if (username.indexOf('@' + domain) !== -1) {
            return username;
        }
        return username + '@' + domain;
    };

    getRoomJid(roomId, username) {
        if (username && username === this.user.username) {
            return this.jid(roomId);
        }

        let jid = roomId + '@' + this.getConfDomain();
        if (username) {
            jid += '/' + username;
        }
        return jid;
    };

    populateVcard(presence, user, core) {
        let vcard = presence.c('x', { xmlns: 'vcard-temp:x:update' });
        let photo = vcard.c('photo');

        let avatar = core.avatars.get(user.id);
        if (avatar) {
            photo.t(avatar.sha1);
        }
    };
}

//
// function XmppConnection(user, client, jid) {
//     Connection.(this, 'xmpp', user);
//     this.client = client;
//     this._jid = jid;
//     this.nicknames = {};
//     client.conn = this;
//     client.on('disconnect', this.disconnect.bind(this));
// }
//
// util.inherits(XmppConnection, Connection);
//
// XmppConnection.prototype.disconnect = function() {
//     this.emit('disconnect');
//
//     if (this.client) {
//         this.client.conn = null;
//         this.client = null;
//     }
// };
//
// XmppConnection.prototype.jid = function(room) {
//     if (room) {
//         return room + '@' + this.getConfDomain() +
//                '/' + (this.nickname(room) || this._jid.local);
//     }
//
//     return this._jid.local + '@' + this.getDomain();
// };
//
// XmppConnection.prototype.nickname = function(room, value) {
//     if (value) {
//         this.nicknames[room] = value;
//     }
//     return this.nicknames[room];
// };
//
// XmppConnection.prototype.getDomain = function() {
//     return this._jid.domain || settings.xmpp.domain;
// };
//
// XmppConnection.prototype.getConfDomain = function() {
//     return 'conference.' + this.getDomain();
// };
//
// XmppConnection.prototype.getUserJid = function(username) {
//     var domain = this.getDomain();
//
//     if (username.indexOf('@' + domain) !== -1) {
//         return username;
//     }
//     return username + '@' + domain;
// };
//
// XmppConnection.prototype.getRoomJid = function(roomId, username) {
//     if (username && username === this.user.username) {
//         return this.jid(roomId);
//     }
//
//     var jid = roomId + '@' + this.getConfDomain();
//     if (username) {
//         jid += '/' + username;
//     }
//     return jid;
// };
//
// XmppConnection.prototype.populateVcard = function(presence, user, core) {
//     var vcard = presence.c('x', { xmlns: 'vcard-temp:x:update' });
//     var photo = vcard.c('photo');
//
//     var avatar = core.avatars.get(user.id);
//     if (avatar) {
//         photo.t(avatar.sha1);
//     }
// };

module.exports = XmppConnection;
