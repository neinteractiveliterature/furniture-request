const express = require('express');
const passport = require('passport');
const _ = require('underscore');

const permission = require('../lib/permission');

function index(req, res, next){
    res.redirect('/requests');
}

function logout(req, res, next){
    req.logout();
    delete req.session.accessToken;
    res.redirect('/');
}

const router = express.Router();

router.get('/',  permission('login'), index);
router.get('/login', passport.authenticate('oauth2'));
router.get('/logout', logout);

router.get('/oauth_callback',
    passport.authenticate('oauth2', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        if (_.has(req.session, 'backto')){
            const backto = req.session.backto;
            delete req.session.backto;
            res.redirect(backto);
        } else {
            res.redirect('/');
        }
    });


module.exports = router;
