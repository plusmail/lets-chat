//
// Let's Chat
//
const config = require('config-yml').load('development')

'use strict';
process.title = 'letschat';

require('colors');

const _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    express = require('express.oi'),
    i18n = require('i18n'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    compression = require('compression'),
    helmet = require('helmet'),
    http = require('http'),
    nunjucks = require('nunjucks'),
    mongoose = require('mongoose'),
    connectMongo = require('connect-mongo/es5'),
    all = require('require-tree'),
    psjon = require('./package.json'),
    auth = require('./app/auth/index'),
    core = require('./app/core/index.js2');

let MongoStore = connectMongo(express.session),
    httpEnabled = config.http && config.http.enable,
    httpsEnabled = config.https && config.https.enable,
    models = all(path.resolve('./app/models')),
    middlewares = all(path.resolve('./app/middlewares')),
    controllers = all(path.resolve('./app/controllers')),
    app;

//
// express.oi Setup
//
if (httpsEnabled) {
     app = express().https({
        key: fs.readFileSync(config.get("https").key),
        cert: fs.readFileSync(config.get("https").cert),
        passphrase: config.get("https").passphrase
    }).io();
} else {
    app = express().http().io();
}

if (config.env === 'production') {
    app.set('env', config.env);
    app.set('json spaces', undefined);
    app.enable('view cache');
}

// Session
const sessionStore = new MongoStore({
    url: config.database.uri,
    autoReconnect: true
});

// Session
const session = {
    key: 'connect.sid',
    secret: config.secrets.cookie,
    store: sessionStore,
    cookie: { secure: httpsEnabled },
    resave: false,
    saveUninitialized: true
};

// Set compression before any routes
//미들웨어를 이용한 압축하기 기본 한계점(threshold :1kb)
app.use(compression({ threshold: 512 }));
app.use(express.static("public"));
app.use(cookieParser());
app.io.session(session);

auth.setup(app, session, core);

// Security protections

app.use(helmet.frameguard()); //X-frame-Options로 클릭재킹 보호
app.use(helmet.hidePoweredBy()); //Header에서 X-PowseredBy 제거(서버정보)
app.use(helmet.ieNoOpen()); //IE8 이상에 대해 X-Download-Options를 설정한다
app.use(helmet.noSniff());
//X-Content-Type-Options 를 설정하여 선언된 콘텐츠 유형으로부터
// 벗어난 응답에 대한 브라우저의 MIME 스니핑을 방지
app.use(helmet.xssFilter());//xss필터는 xss필터

//웹 사이트에 접속할 때 강제적으로 HTTPS로 접속하게 강제하는 기능
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubdomains: true,
    force: httpsEnabled,
    preload: true
}));

// XSS나 Data Injection, Click Jacking 등 웹 페이지에 악성 스크립트를 삽입하는 공격기법들을 막기
app.use(helmet.contentSecurityPolicy({
    defaultSrc: ['\'none\''],
    connectSrc: ['*'],
    scriptSrc: ['\'self\'', '\'unsafe-eval\''],
    styleSrc: ['\'self\'', 'fonts.googleapis.com', '\'unsafe-inline\''],
    fontSrc: ['\'self\'', 'fonts.gstatic.com'],
    mediaSrc: ['\'self\''],
    objectSrc: ['\'self\''],
    imgSrc: ['* data:']
}));

const bundles = {};
app.use(require('connect-assets')({
    paths: [
        'media/js',
        'media/less'
    ],
    helperContext: bundles,
    build: config.env === 'production',
    fingerprinting: config.env === 'production',
    servePath: 'media/dist'
}));

// Public
app.use('/media', express.static(__dirname + '/media', {
    maxAge: '364d'
}));

// Templates
const nun = nunjucks.configure('templates', {
    autoescape: true,
    express: app,
    tags: {
        blockStart: '<%',
        blockEnd: '%>',
        variableStart: '<$',
        variableEnd: '$>',
        commentStart: '<#',
        commentEnd: '#>'
    }
});

function wrapBundler(func) {
    // This method ensures all assets paths start with "./"
    // Making them relative, and not absolute
    return function() {

        return func.apply(func, arguments)
                   .replace(/href="\//g, 'href="./')
                   .replace(/src="\//g, 'src="./');
    };
}

nun.addFilter('js', wrapBundler(bundles.js));
nun.addFilter('css', wrapBundler(bundles.css));
nun.addGlobal('text_search', false);

// i18n
i18n.configure({
    directory: path.resolve(__dirname, './locales'),
    locales: config.i18n.locales || config.i18n.locale,
    defaultLocale: config.i18n.locale
});
app.use(i18n.init);

// HTTP Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// IE header
app.use(function(req, res, next) {
    res.setHeader('X-UA-Compatible', 'IE=Edge,chrome=1');
    next();
});

//
// Controllers
//

_.each(controllers, function(controller) {
    controller.apply({
        app: app,
        core: core,
        middlewares: middlewares,
        models: models,
        controllers: controllers
    });
});

//
// Mongo
//

mongoose.connection.on('error', function (err) {
    throw new Error(err);
});

mongoose.connection.on('disconnected', function() {
    throw new Error('Could not connect to database');
});

//
// Go Time
//

function startApp() {
    let port = httpsEnabled && config.https.port ||
               httpEnabled && config.http.port;

    let host = httpsEnabled && config.https.host ||
               httpEnabled && config.http.host || '0.0.0.0';



    if (httpsEnabled && httpEnabled) {
        // Create an HTTP -> HTTPS redirect server
        let redirectServer = express();
        redirectServer.get('*', function(req, res) {
            let urlPort = port === 80 ? '' : ':' + port;
            res.redirect('https://' + req.hostname + urlPort + req.path);
        });
        http.createServer(redirectServer)
            .listen(config.http.port || 5000, host);
    }

    app.listen(port, host);

    //
    // XMPP
    //
    if (config.xmpp.enable) {
        let xmpp = require('./app/xmpp/index');
        xmpp(core);
    }

    let art = fs.readFileSync('./app/misc/art.txt', 'utf8');
    console.log('\n' + art + '\n\n' + 'Release ' + psjon.version.yellow + '\n');
}

function checkForMongoTextSearch() {
    if (!mongoose.mongo || !mongoose.mongo.Admin) {
        // MongoDB API has changed, assume text search is enabled
        nun.addGlobal('text_search', true);
        return;
    }

    let admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.buildInfo(function (err, info) {
        if (err || !info) {
            return;
        }

        let version = info.version.split('.');
        if (version.length < 2) {
            return;
        }

        if(version[0] < 2) {
            return;
        }

        if(version[0] === '2' && version[1] < 6) {
            return;
        }

        nun.addGlobal('text_search', true);
    });
}

mongoose.connect(config.database.uri, function(err) {
    if (err) {
        throw err;
    }

    checkForMongoTextSearch();
    startApp();
});
