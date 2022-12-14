'use strict';

const _ = require('lodash'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    plugins = require('./plugins');

function parseEnvValue(value, isArray) {
    value = value.trim();
    if (isArray) {
        return _.map(value.split(','), function(value) {
            return parseEnvValue(value);
        });
    }
    // YAML compatible boolean values
    else if (/^(y|yes|true|on)$/i.test(value)) {
        return true;
    }
    else if (/^(n|no|false|off)$/i.test(value)) {
        return false;
    }
    else if (/^[+-]?\d+.?\d*$/.test(value) &&
             !isNaN(parseInt(value, 10))) {
        return parseInt(value, 10);
    }
    return value;
}

const pipeline = [

    function getDefaultSettings(context) {
        let file = fs.readFileSync('defaults.yml', 'utf8');
        context.defaults = yaml.safeLoad(file);
    },

    function getFileSettings(context) {
        let file;
        if (fs.existsSync('config/settings.yml')) {
            file = fs.readFileSync('config/settings.yml', 'utf8');
            context.file = yaml.safeLoad(file) || {};
        } else if (fs.existsSync('settings.yml')) {
            file = fs.readFileSync('settings.yml', 'utf8');
            context.file = yaml.safeLoad(file) || {};
        } else {
            context.file = {};
        }
    },

    function getFilePlugin(context) {
        const provider = process.env.LCB_FILES_PROVIDER ||
                      context.file.files && context.file.files.provider ||
                      context.defaults.files && context.defaults.files.provider;

        context.plugins.files = [ provider ];
    },

    function getAuthPlugins(context) {
        let providers = [];
        const env = process.env.LCB_AUTH_PROVIDERS;
        if (env) {
            providers = parseEnvValue(env, true);
        } else {
            providers = context.file.auth && context.file.auth.providers ||
                    context.defaults.auth && context.defaults.auth.providers;
        }

        context.plugins.auth = providers;
    },

    function getFilePluginDefaults(context) {
        _.each(context.plugins.files, function(key) {
            if (key === 'local') {
                return;
            }

            let plugin = plugins.getPlugin(key, 'files');

            if (!plugin || !plugin.defaults) {
                return;
            }

            context.defaults.files[key] = plugin.defaults;
        });
    },

    function getAuthPluginDefaults(context) {
        _.each(context.plugins.auth, function(key) {
            if (key === 'local') {
                return;
            }

            let plugin = plugins.getPlugin(key, 'auth');

            if (!plugin || !plugin.defaults) {
                return;
            }

            context.defaults.auth[key] = plugin.defaults;
        });
    },

    function mergeDefaultAndFileSettings(context) {
        context.result = _.merge(context.defaults, context.file);
    },

    function mergeEnvSettings(context) {
        function recurse(baseKey, object) {
            _.forEach(object, function(value, key) {
                let envKey = baseKey + '_' +
                             key.replace(/([A-Z]+)/g, '_$1').toUpperCase();
                if (_.isPlainObject(value)) {
                    recurse(envKey, value);
                } else {
                    let val = process.env[envKey];
                    if (val) {
                        object[key] = parseEnvValue(val,
                                                    _.isArray(object[key]));
                    }
                }
            });
        }

        recurse('LCB', context.result);
    },

    function addXmppConfHost(context) {
        // Deprecating xmpp.host in favour of xmpp.domain
        if (context.result.xmpp.host) {
            console.log('DEPRECATED: xmpp.host setting has been deprecated, please use xmpp.domain instead');
            context.result.xmpp.domain = context.result.xmpp.host;
        }

        if (context.result.xmpp.domain) {
            context.result.xmpp.confdomain = 'conference.' +
                                             context.result.xmpp.domain;
        }
    },

    function overrideEnvSetting(context) {
        if (process.env.NODE_ENV) {
            context.result.env = process.env.NODE_ENV;
        }
    },

    function overridePortSetting(context) {
        if (process.env.PORT) {
            context.result.http.port = process.env.PORT;
        }
    },

    function herokuDbUrl(context) {
        // Override database URI - if using a Heroku add-on
        if (process.env.MONGOHQ_URL) {
            context.result.database.uri = process.env.MONGOHQ_URL;
        }
        if (process.env.MONGOLAB_URI) {
            context.result.database.uri = process.env.MONGOLAB_URI;
        }
        if (process.env.MONGODB_URI) {
            context.result.database.uri = process.env.MONGODB_URI;
        }
    },

    function openShift(context) {
        if (process.env.OPENSHIFT_APP_NAME) {
            context.result.http.host = process.env.OPENSHIFT_NODEJS_IP;
            context.result.http.port = process.env.OPENSHIFT_NODEJS_PORT;
            context.result.database.uri = process.env.OPENSHIFT_MONGODB_DB_URL +
                                          process.env.OPENSHIFT_APP_NAME;

        }
    }
];

const context = {
    plugins: {},
    export: {}
};

_.each(pipeline, function(step) {
    step(context);
});

module.exports = context.result;
