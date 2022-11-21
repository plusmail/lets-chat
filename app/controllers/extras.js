//
// Emotes / Replacements Controller
//

'use strict';

module.exports = function() {

    const _ = require('lodash'),
        fs = require('fs'),
        path = require('path'),
        yaml = require('js-yaml'),
        express = require('express.oi');

    const app = this.app,
        middlewares = this.middlewares;

    //
    // Routes
    //
    app.get('/extras/emotes', middlewares.requireLogin, function(req) {
        req.io.route('extras:emotes:list');
    });

    app.use('/extras/emotes/',
        express.static(path.join(process.cwd(), 'extras/emotes/public'), {
            maxage: '364d'
        })
    );

    app.get('/extras/replacements', middlewares.requireLogin, function(req) {
        req.io.route('extras:replacements:list');
    });

    //
    // Sockets
    //
    app.io.route('extras', {
        'emotes:list': function(req, res) {
            let emotes = [];

            let dir = path.join(process.cwd(), 'extras/emotes');
            fs.readdir(dir, function(err, files) {
                if (err) {
                    return res.json(emotes);
                }

                let regex = new RegExp('\\.yml$');

                files = files.filter(function(fileName) {
                    return regex.test(fileName);
                });

                files.forEach(function(fileName) {
                    let fullpath = path.join(
                        process.cwd(),
                        'extras/emotes',
                        fileName
                    );

                    let imgDir = 'extras/emotes/' +
                        fileName.replace('.yml', '') + '/';

                    let file = fs.readFileSync(fullpath, 'utf8');
                    let data = yaml.safeLoad(file);
                    _.each(data, function(emote) {
                        emote.image = imgDir + emote.image;
                        emotes.push(emote);
                    });
                });

                res.json(emotes);
            });
        },
        'replacements:list': function(req, res) {
            let replacements = [];
            ['default.yml', 'local.yml'].forEach(function(filename) {
                let fullpath = path.join(process.cwd(), 'extras/replacements/' + filename);
                if (fs.existsSync(fullpath)) {
                    replacements = _.merge(replacements, yaml.safeLoad(fs.readFileSync(fullpath, 'utf8')));
                }
            });
            res.json(replacements);
        }
    });

};
