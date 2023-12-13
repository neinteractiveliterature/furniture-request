const express = require('express');
const passport = require('passport');
const _ = require('underscore');

const permission = require('../lib/permission');

function index(req, res){
    res.redirect('/requests');
}

function logout(req, res){
    req.logout();
    delete req.session.accessToken;
    res.redirect('/');
}

async function getCss(req, res){
    res.setHeader('content-type', 'text/css');
    const css = await req.models.display_text.getByName('siteCss');
    if (css){
        res.send(css.content);
    } else res.send('');
}

const router = express.Router();

router.get('/',  permission('login'), index);
router.get('/css', getCss);
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
