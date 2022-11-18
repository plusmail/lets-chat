'use strict';
//lodash array, collection, date 등 데이터의 필수적인 구조를 쉽게 다룰 수 있게끔 하는데에 사용
var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('lodash'),
    AccountManager = require('./account'),
    AvatarCache = require('./avatar-cache'),
    FileManager = require('./files'),
    MessageManager = require('./messages'),
    PresenceManager = require('./presence'),
    RoomManager = require('./rooms'),
    UserManager = require('./users'),
    UserMessageManager = require('./usermessages');


class Core extends EventEmitter {
    constructor() {
        super();

        this.account = new AccountManager({
            core: this
        });

        this.files = new FileManager({
            core: this
        });

        this.messages = new MessageManager({
            core: this
        });

        this.presence = new PresenceManager({
            core: this
        });

        this.rooms = new RoomManager({
            core: this
        });

        this.users = new UserManager({
            core: this
        });

        this.usermessages = new UserMessageManager({
            core: this
        });

        this.avatars = new AvatarCache({
            core: this
        });

        this.onAccountUpdated = this.onAccountUpdated.bind(this);

    }

    onAccountUpdated(data){
        this.emit('account:update', data);
    }
    //
    // on('account:update', this.onAccountUpdated);
}

const core = new Core();
core.on('account:update', (data) => {
    let userId = data.user.id.toString();
    console.log('1111111111111111->', userId);
    console.log('222222222222222->', this.presence);
    let user = data.user;

    if (!user) {
        return;
    }

    let new_data = {
        userId: userId,
        oldUsername: user.username,
        username: data.user.username
    };

    if (user) {
        _.assign(user, data.user, {id: userId});
    }

    if (data.usernameChanged) {
        // Emit to all rooms, that this user has changed their username
        this.presence.rooms.usernameChanged(new_data);
    }
});

core.onAccountUpdated

module.exports = core;
