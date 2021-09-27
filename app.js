var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var flash = require('express-flash');
var session = require('express-session');
var config = require('config');
var _ = require('underscore');
var moment = require('moment');
var methodOverride = require('method-override');
var redis = require('redis');
var passport = require('passport');
var { URL } = require('url');
var OAuth2Strategy = require('passport-oauth2').Strategy;

var models = require('./lib/models');

var Intercode = require('./lib/intercode');
var permission = require('./lib/permission');

var furnitureHelper = require('./lib/furniture-helper');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var requestsRouter = require('./routes/requests');
var furnitureRouter = require('./routes/furniture');
var reportsRouter = require('./routes/reports');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride(function(req, res){
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
        var method = req.body._method;
        delete req.body._method;
        return method;
    }
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var sessionConfig = {
    secret: config.get('app.sessionSecret'),
    rolling: true,
    saveUninitialized: true,
    resave: false,
};

if (config.get('app.sessionType') === 'redis'){
    var RedisStore = require('connect-redis')(session);
    var redisClient = null;
    if (config.get('app.redisURL')){
        var redisToGo   = new URL(config.get('app.redisURL'));
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

passport.deserializeUser(function(id, cb) {
    models.user.get(id, function(err, user) {
        cb(err, user);
    });
});

var passportClient = new OAuth2Strategy(config.get('auth'),
    function(req, accessToken, refreshToken, profile, cb) {
        models.user.findOrCreate({
            name: profile.name,
            intercode_id: profile.id,
            email: profile.email
        }, function(err, user){
            if (err) { return cb(err); }
            req.session.accessToken = accessToken;
            return cb(null, user);
        });
    }
);

passportClient.userProfile = function (token, cb) {
    var intercode = new Intercode(token);
    intercode.getUser(function(err, data){
        if (err) { return cb(err); }
        cb(null, data.currentUser);
    });
};

passport.use(passportClient);

// Setup intercode connection for routes
app.use(function(req, res, next){
    if (req.session.accessToken && req.user && !req.originalUrl.match(/^\/log(in|out)/) ){
        req.intercode = new Intercode(req.session.accessToken);
        req.intercode.getMemberEvents(req.user.intercode_id, function(err, events){
            if (err) {
                if(err.response && err.response.error === 'invalid_token'){
                    req.logout();
                    console.log('deleting token');
                    delete req.session.accessToken;
                    return res.redirect(req.originalUrl);
                } else {
                    return next(err);
                }
            }
            req.user.events = events;
            next();
        });
    } else {
        next();
    }
});

// Set common helpers for the view
app.use(function(req, res, next){
    res.locals.config = config;
    res.locals.session = req.session;
    res.locals.title = config.get('app.name');
    res.locals._ = _;
    res.locals.moment = moment;
    res.locals.humanize = furnitureHelper.humanize;
    res.locals.teamMembers = furnitureHelper.teamMembers;
    res.locals.activeUser = req.user;
    next();
});

app.use(permission());

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
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
