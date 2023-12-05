'use strict';
const _ = require('underscore');
const config = require('config');

const permissionLookup = {
    'GM Coordinator' : 'Div Head',
    'Con Com': 'Hotel Team',
    'Hotel Liaison': 'Administrator'
};

module.exports = function(permission, redirect){
    return async function(req, res, next){
        if (! (_.has(req, 'user') && _.has(req, 'intercode'))){
            res.locals.checkPermission = getCheckPermission(req, {
                permissions: {
                    privileges: [],
                    positions: []
                },
                events: []
            });
            if (!permission){ return next(); }
            return fail(req, res, 'not logged in', redirect);
        } else {
            try {
                const permissions = await req.intercode.getPermissions(req.user.intercode_id);
                const events = await req.intercode.getMemberEvents( req.user.intercode_id);
                res.locals.checkPermission = getCheckPermission(req, {permissions: permissions, events:events});

                if (!permission){ return next(); }

                if (check(req, {permissions: permissions, events:events}, permission)){
                    return next();
                }
                return fail(req, res, 'permission fail', redirect);
            } catch (err) {
                return next(err);
            }
        }
    };
};

function getCheckPermission(req, data){
    return function checkPermission(permission, eventId){
        return check(req, data, permission, eventId);
    };
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

function check(req, data, permission){
    const user = req.user;
    let eventId = null;

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

    // Override Intercon permissions for Arisia
    if (config.get('app.arisiaMode') && _.has(permissionLookup, permission)){
        permission = permissionLookup[permission];
    }

    // Check to see if logged in
    if (permission === 'login'){
        if (user) {
            return true;

        }

    // Staff get all permissions
    } else if (data.permissions.privileges.indexOf('staff') !== -1 || data.permissions.privileges.indexOf('site_admin') !== -1){
        return true;
    // Conchair and Webteam get all permissions
    } else if (data.permissions.positions.indexOf('Con Chair') !== -1 || data.permissions.privileges.indexOf('Website Team') !== -1 || data.permissions.positions.indexOf('Administrator') !== -1){
        return true;
    // Check for specific permission in privileges
    } else if (data.permissions.privileges.indexOf(permission) !== -1){
        return true;
    // Check for specific permission in positions
    } else if (data.permissions.positions.indexOf(permission) !== -1){
        return true;
    // Check for team member of event
    } else if (eventId && _.pluck(data.events, 'id').indexOf(eventId) !== -1){
        return true;
    // Fail
    } else {
        return false;
    }
}
