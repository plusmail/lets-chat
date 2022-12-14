'use strict';

const xmpp = require('node-xmpp-server'),
    IQ = xmpp.IQ,
    settings = require('./../config'),
    auth = require('./../auth/index'),
    all = require('require-tree'),
    XmppConnection = require('./xmpp-connection');

const allArray = function(path) {
        let modules = all(path);
        return Object.keys(modules).map(function(key) {
            return modules[key];
        });
    },
    msgProcessors = allArray('./msg-processors'),
    eventListeners = allArray('./events');

function xmppStart(core) {
    let options = {
        port: settings.xmpp.port,
        domain: settings.xmpp.domain
    };

    if (settings.xmpp.tls && settings.xmpp.tls.enable) {
        options.tls = {
            keyPath: settings.xmpp.tls.key,
            certPath: settings.xmpp.tls.cert
        };
    }

    const c2s = new xmpp.C2SServer(options);

    c2s.on('connect', function(client) {

        client.on('authenticate', function(opts, cb) {
            let username = settings.xmpp.username === 'full' ?
                           opts.jid.toString() : opts.jid.local;

            auth.authenticate(username, opts.password, function(err, user) {
                if (err || !user) {
                    return cb(false);
                }

                // TODO: remove?
                client.user = user;

                let conn = new XmppConnection(user, client, opts.jid);
                core.presence.connect(conn);

                cb(null, opts);
            });
        });

        client.on('online', function() {
        });

        client.on('stanza', function(stanza) {
            let handled = msgProcessors.some(function(Processor) {
                let processor = new Processor(client, stanza, core);
                return processor.run();
            });

            if (handled) {
                return;
            }

            if (settings.xmpp.debug.unhandled) {
                // Print unhandled request
                console.log(' ');
                console.log(stanza.root().toString().red);
            }

            if (stanza.name !== 'iq') {
                return;
            }

            let msg = new IQ({
                type: 'error',
                id: stanza.attrs.id,
                to: stanza.attrs.from,
                from: stanza.attrs.to
            });

            msg.c('not-implemented', {
                code: 501,
                type: 'CANCEL'
            }).c('feature-not-implemented', {
                xmlns: 'urn:ietf:params:xml:n:xmpp-stanzas'
            });


            if (settings.xmpp.debug.unhandled) {
                console.log(msg.root().toString().green);
            }

            client.send(msg);
        });

        // On Disconnect event. When a client disconnects
        client.on('disconnect', function() {
        });
    });

    eventListeners.forEach(function(EventListener) {
        let listener = new EventListener(core);
        core.on(listener.on, listener.then);
    });
}

module.exports = xmppStart;
