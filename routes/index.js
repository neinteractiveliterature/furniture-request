var express = require('express');
var passport = require('passport');
var _ = require('underscore');

var permission = require('../lib/permission');

function index(req, res, next){
    res.redirect('/requests');
}

function logout(req, res, next){
    req.logout();
    res.redirect('/');
}

var router = express.Router();

router.get('/',  permission('login'), index);
router.get('/login', passport.authenticate('oauth2'));
router.get('/logout', logout);

router.get('/oauth_callback',
    passport.authenticate('oauth2', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        if (_.has(req.session, 'backto')){
            var backto = req.session.backto;
            delete req.session.backto;
            res.redirect(backto);
        } else {
            res.redirect('/');
        }
    });


module.exports = router;
