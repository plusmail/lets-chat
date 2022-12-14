//
// Connections Controller
//

'use strict';

module.exports = function () {

    const app = this.app,
        core = this.core,
        middlewares = this.middlewares;

    //
    // Routes
    //
    app.get('/connections', middlewares.requireLogin, function (req) {
        req.io.route('connections:list');
    });

    app.get('/connections/type/:type', middlewares.requireLogin, function (req) {
        req.io.route('connections:list');
    });

    app.get('/connections/user/:user', middlewares.requireLogin, function (req) {
        req.io.route('connections:list');
    });

    //
    // Sockets
    //
    app.io.route('connections', {
        list: function (req, res) {
            let query = {};

            if (req.param('type')) {
                query.type = req.param('type');
            }

            if (req.param('user')) {
                query.user = req.param('user');
            }

            let connections = core.presence.system.connections.query(query);
            res.json(connections);
        }
    });
};
