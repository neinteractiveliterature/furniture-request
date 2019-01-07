var express = require('express');
var async = require('async');
var csrf = require('csurf');
var _ = require('underscore');
var permission = require('../lib/permission');
var funitureHelper = require('../lib/furniture-helper');


function list(req, res, next){
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/reports', name: 'Reports'},
        ],
        current: 'List'
    };
    req.intercode.getEvents(function(err, events){
        if (err) { return next(err); }
        funitureHelper.getRunList(events, function(err, runs){
            if (err) { return next(err); }
            res.locals.runs = _.sortBy(runs, "starts_at");
            async.map(res.locals.runs, function(run, cb){
                req.models.requests.listByRun(run.id, function(err, requests){
                    if (err) { return cb(err); }
                    run.requests = requests
                    cb(null, run);
                });
            }, function(err){
                if (err) { return next(err); }
                res.render('reports/list', { pageTitle: 'All Furniture Requests' });
            });
        });
    });
}

var router = express.Router();
router.use(funitureHelper.setSection('reports'));
router.use(permission('con_com'));

router.get('/', function(req, res, next){
    res.redirect('/reports/list');
})

router.get('/list', list);

module.exports = router;

