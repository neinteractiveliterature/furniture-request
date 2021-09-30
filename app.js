const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { json: jsonParser, urlencoded: urlEncodedParser } = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const config = require('config');
const _ = require('underscore');
const moment = require('moment');
const methodOverride = require('method-override');
const redis = require('redis');
const passport = require('passport');
const { URL } = require('url');
const OAuth2Strategy = require('passport-oauth2').Strategy;

const models = require('./lib/models');

const Intercode = require('./lib/intercode');
const permission = require('./lib/permission');

const furnitureHelper = require('./lib/furniture-helper');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const requestsRouter = require('./routes/requests');
const furnitureRouter = require('./routes/furniture');
const reportsRouter = require('./routes/reports');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(jsonParser());
app.use(urlEncodedParser({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride(function(req){
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
    secret: config.get('app.sessionSecret'),
    rolling: true,
    saveUninitialized: true,
    resave: false,
};

if (config.get('app.sessionType') === 'redis'){
    const RedisStore = require('connect-redis')(session);
    let redisClient = null;
    if (config.get('app.redisURL')){
        const redisToGo   = new URL(config.get('app.redisURL'));
        redisClient = redis.createClient(redisToGo.port, redisToGo.hostname);

        redisClient.auth(redisToGo.auth.split(':')[1]);

    } else {
        redisClient = redis.createClient();
    }
    sessionConfig.store = new RedisStore({ client: redisClient });
    sessionConfig.resave = true;
}

app.use(session(sessionConfig));
app.use(flash());

app.use(function(req, res, next){
    req.models = models;
    next();
});

app.use(permission());

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(async function(id, cb) {
    try {
        const user = await models.user.get(id);
        cb(null, user);
    } catch (err) {
        cb(err);
    }
});

const passportClient = new OAuth2Strategy(config.get('auth'),
    async function(req, accessToken, refreshToken, profile, cb) {
        try {
            const user = await models.user.findOrCreate({
                name: profile.name,
                intercode_id: profile.id,
                email: profile.email
            });
            req.session.accessToken = accessToken;
            cb(null, user);
        } catch (err) {
            cb(err);
        }
    }
);

// as far as I can tell, passport doesn't support promise style calls, so we'll have to call
// their callback the old fashioned way
passportClient.userProfile = async function (token, cb) {
    const intercode = new Intercode(token);
    try {
        const data = await intercode.getUser();
        cb(null, data.currentUser);
    } catch (err) {
        cb(err);
    }
};

passport.use(passportClient);

// Setup intercode connection for routes
app.use(async function(req, res, next){
    if (req.session.accessToken && req.user && !req.originalUrl.match(/^\/log(in|out)/) ){
        req.intercode = new Intercode(req.session.accessToken);
    }

    next();
});

// Fetch layout data from Intercode
app.use(async function(req, res, next) {
    const setFallbackContent = () => new Promise((resolve) => {
        const navbarClasses = 'navbar navbar-expand-md navbar-dark bg-dark fixed-top intercon-menubar mb-4 fh-fixedHeader';
        res.locals.navbarClasses = navbarClasses;
        res.render('layout-fallback', {}, (err, html) => {
            req.layoutData = {
                content: html ?? '',
                navbarClasses: navbarClasses,
            };
            // always resolve, even if we got no HTML back and errored
            resolve();
        });
    });

    if (req.intercode) {
        try {
            req.layoutData = await req.intercode.getLayoutData();
        } catch (err) {
            await setFallbackContent();
        }
    } else {
        await setFallbackContent();
    }
    next();
});

// Set common helpers for the view
app.use(async function(req, res, next) {
    res.locals.config = config;
    res.locals.session = req.session;
    res.locals.title = config.get('app.name');
    res.locals._ = _;
    res.locals.moment = moment;
    res.locals.humanize = furnitureHelper.humanize;
    res.locals.teamMembers = furnitureHelper.teamMembers;
    res.locals.activeUser = req.user;
    res.locals.navbarClasses = req.layoutData?.navbarClasses;

    const originalRender = res.render;
    const asyncOriginalRender = (view, options) => new Promise((resolve, reject) => {
        originalRender(view, options, (err, html) => {
            if (err) {
                reject(err);
            } else {
                resolve(html);
            }
        });
    });
    res.render = async (view, optionsOrNext, nextIfOptions) => {
        let options = optionsOrNext;
        let next = nextIfOptions;
        if ('function' == typeof optionsOrNext) {
            next = options;
            options = {};
        }
        try {
            if (req.layoutData) {
                const { content: layoutHTML } = req.layoutData;
                const [headHTML, navbarHTML, bodyHTML] = await Promise.all([
                    asyncOriginalRender('head', options),
                    asyncOriginalRender('navbar', options),
                    asyncOriginalRender(view, options),
                ]);
                const finalHTML = layoutHTML
                    .replace(/\{\{\s*content_for_head\s*\}\}/g, headHTML)
                    .replace(/\{\{\s*content_for_navbar\s*\}\}/g, navbarHTML)
                    .replace(/\{\{\s*content_for_layout\s*\}\}/g, bodyHTML);
                if (next) {
                    next(null, finalHTML);
                } else {
                    res.send(finalHTML);
                }
            } else {
                originalRender(view, options, next);
            }
        } catch (err) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            originalRender('error');
        }
    };
    next();
});

// TODO: Dave, can we get rid of this?  There's another instance of it on line 84 and having two
// of them results in duplicate GraphQL queries.  Not sure if there's a reason we want to do it
// in two places in the stack.
// app.use(permission());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/requests', requestsRouter);
app.use('/furniture', furnitureRouter);
app.use('/reports', reportsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
// Disabling no-unused-vars because Express cares about the arity of error handlers, so we need to
// accept the next param even though we don't use it
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    if (err instanceof Intercode.InvalidTokenError) {
        req.logout();
        console.log('deleting token');
        delete req.session.accessToken;
        return res.redirect(req.originalUrl);
    }

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
