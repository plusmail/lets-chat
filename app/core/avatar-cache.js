'use strict';

const crypto = require('crypto'),
    http = require('http');

class AvatarCache {
    constructor(options) {
        this.core = options.core;
        this.avatars = {};

        this.get = this.get.bind(this);
        this.add = this.add.bind(this);
    }


    get(userId) {
        return this.avatars[userId];
    };

    add(user) {
        let userId = (user.id || user._id).toString();
        let url = 'http://www.gravatar.com/avatar/' + user.avatar + '?s=64';

        http.get(url, function (response) {
            if (response.statusCode !== 200) {
                return;
            }

            let buffers = [];

            response.on('data', function (buffer) {
                buffers.push(buffer);
            });

            response.on('end', function () {
                let buffer = Buffer.concat(buffers);

                this.avatars[userId] = {
                    base64: buffer.toString('base64'),
                    sha1: crypto.createHash('sha1').update(buffer).digest('hex')
                };

                this.core.emit('avatar-cache:update', user);
            }.bind(this));
        }.bind(this)).on('error', function () {
        });
    };

}

// function AvatarCache(options) {
//     this.core = options.core;
//     this.avatars = {};
//
//     this.get = this.get.bind(this);
//     this.add = this.add.bind(this);
// }
//
// AvatarCache.prototype.get = function(userId) {
//     return this.avatars[userId];
// };
//
// AvatarCache.prototype.add = function(user) {
//     var userId = (user.id || user._id).toString();
//     var url = 'http://www.gravatar.com/avatar/' + user.avatar + '?s=64';
//
//     http.get(url, function(response) {
//         if (response.statusCode !== 200) {
//             return;
//         }
//
//         var buffers = [];
//
//         response.on('data', function(buffer) {
//             buffers.push(buffer);
//         });
//
//         response.on('end', function() {
//             var buffer = Buffer.concat(buffers);
//
//             this.avatars[userId] = {
//                 base64: buffer.toString('base64'),
//                 sha1: crypto.createHash('sha1').update(buffer).digest('hex')
//             };
//
//             this.core.emit('avatar-cache:update', user);
//         }.bind(this));
//     }.bind(this)).on('error', function(){ });
// };

module.exports = AvatarCache;
