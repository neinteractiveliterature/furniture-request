import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { json as jsonParser, urlencoded as urlEncodedParser } from 'body-parser';
import flash from 'express-flash';
import session, { SessionOptions } from 'express-session';
import config from 'config';
import _ from 'underscore';
import moment from 'moment';
import methodOverride from 'method-override';
import redis from 'redis';
import passport from 'passport';
import { URL } from 'url';
import PassportOAuth2, { StrategyOptionsWithRequest, VerifyCallback } from 'passport-oauth2';
import ConnectRedis from 'connect-redis';
import ConnectPgSimple from 'connect-pg-simple';

import models from './lib/models';

import Intercode, { InvalidTokenError } from './lib/intercode';
import permission from './lib/permission';
import * as database from './lib/database';

import * as furnitureHelper from './lib/furniture-helper';

import indexRouter from './routes/index';
import usersRouter from './routes/users';
import requestsRouter from './routes/requests';
import furnitureRouter from './routes/furniture';
import reportsRouter from './routes/reports';
import textRouter from './routes/text';
import { User } from './models/user';
import { ErrorRequestHandler } from 'express-serve-static-core';


declare module 'express-serve-static-core' {
    interface Request {
        models: unknown,
        intercode: Intercode
    }
}

declare module 'express-session' {
    interface SessionData {
        accessToken?: string
    }
}

const OAuth2Strategy = PassportOAuth2.Strategy;

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

const sessionConfig: SessionOptions = {
    secret: config.get('app.sessionSecret'),
    rolling: true,
    saveUninitialized: true,
    resave: false,
};

switch (config.get('app.sessionType')){
    case 'redis': {
        const RedisStore = ConnectRedis(session);
        let redisClient = null;
        if (config.get('app.redisURL')){
            const redisToGo   = new URL(config.get('app.redisURL'));
            redisClient = redis.createClient(redisToGo.port, redisToGo.hostname);
            redisClient.auth(redisToGo.password);
        } else {
            redisClient = redis.createClient();
        }
        sessionConfig.store = new RedisStore({ client: redisClient });
        sessionConfig.resave = true;
        break;
    }

    case 'postgresql': {
        const pgSession = ConnectPgSimple(session);
        sessionConfig.store = new pgSession({
            pool: database.pool,
            tableName: 'session'
        });
        break;
    }
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

passport.serializeUser(function(user: User, cb) {
    cb(null, user.id);
});

passport.deserializeUser(async function(id: number, cb) {
    try {
        const user = await models.user.get(id);
        cb(null, user);
    } catch (err) {
        cb(err);
    }
});

const passportClient = new OAuth2Strategy(
  config.get('auth') as StrategyOptionsWithRequest,
  async function (
      req: Express.Request,
      accessToken: string,
      refreshToken: string,
      profile: { name: string, id: string, email: string },
      cb: VerifyCallback,
  ) {
      try {
          const user = await models.user.findOrCreate({
              name: profile.name,
              intercode_id: profile.id,
              email: profile.email,
          });
          req.session.accessToken = accessToken;
          cb(null, user);
      } catch (err) {
          cb(err);
      }
  },
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

// Set common helpers for the view
app.use(async function(req, res, next){
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


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/requests', requestsRouter);
app.use('/furniture', furnitureRouter);
app.use('/reports', reportsRouter);
app.use('/text', textRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
// Disabling no-unused-vars because Express cares about the arity of error handlers, so we need to
// accept the next param even though we don't use it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function(err, req, res, _next) {
    if (err instanceof InvalidTokenError) {
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
} satisfies ErrorRequestHandler);

export default app;
