'use strict';
var config = require('config');
var _ = require('underscore');
var async = require('async');
var models = require('./models');

module.exports = function(permission, redirect){
    return function(req, res, next){
        if (! (_.has(req, 'user') && _.has(req, 'intercode'))){
            res.locals.checkPermission = getCheckPermission(req, []);
            if (!permission){ return next(); }
            return fail(req, res, 'not logged in', redirect);
        } else {
            req.intercode.getPermissions(req.user.intercode_id, function(err, permissions){
                if (err) { return next(err); }

                res.locals.checkPermission = getCheckPermission(req, permissions);

                if (!permission){ return next(); }

                if (check(req, permissions, permission)){
                    return next();
                }

                return fail(req, res, 'permission fail', redirect);
            });
        }
    };
}

function getCheckPermission(req, permissions){
    return function checkPermission(permission, eventId){
         return check(req, permissions, permission, eventId);
    }
}

 function fail(req, res, reason, redirect){
    if (reason === 'not logged in'){
        if (req.originalUrl.match(/\/api\//)){
            res.header('WWW-Authenticate', 'Basic realm="feedbacker"');
            res.status(401).send('Authentication required');
        } else {
            if (!req.session.backto &&
                ! req.originalUrl.match(/\/login/) &&
                ! req.originalUrl.match(/^\/$/) ){
                req.session.backto = req.originalUrl;
            }
            res.redirect('/login');
        }
    } else {
        if (redirect){
            req.flash('error', 'You are not allowed to access that resource');
            res.redirect(redirect);
        } else {
            res.status('403').send('Forbidden');
        }
    }
}

function check(req, permissions, permission){
    var user = req.user;
    var eventId = null;

    if (user && user.locked){
        return false;
    }

    if (typeof(permission) === 'object'){
        if (_.has(permission, 'eventId')){
            eventId = permission.eventId;
        }
        if (_.has(permission, 'permission')){
            permission = permission.permission;
        }
    }
    if (typeof permission !== 'string'){
        return false;
    }

    // Check to see if logged in
    if (permission === 'login'){
        if (user) {
            return true;

        }
    // Staff get all permissions
    } else if (permissions.indexOf('staff') !== -1 || permissions.indexOf('site_admin') !== -1){
        return true;
    // Check for specific permission
    } else if (permissions.indexOf(permission) !== -1){
        return true;
    // Check for team member of event
    } else if (eventId && _.pluck(user.events, 'id').indexOf(Number(eventId)) !== -1){
        return true;
    // Fail
    } else {
        return false;
    }
}
