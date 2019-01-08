var express = require('express');
var async = require('async');
var csrf = require('csurf');
var _ = require('underscore');
var permission = require('../lib/permission');
var furnitureHelper = require('../lib/furniture-helper');

function listReports(req, res, next){
    res.render('reports/index', {pageTitle: 'Furniture Reports'});
}

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
        furnitureHelper.getRunList(events, function(err, runs){
            if (err) { return next(err); }
            res.locals.runs = _.sortBy(runs, "starts_at");
            res.render('reports/list', { pageTitle: 'All Furniture Requests' });
        });
    });
}

function rooms(req, res, next){
   res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/reports', name: 'Reports'},
        ],
        current: 'Room Report'
    };
    getRoomData(req, function(err, result){
        res.locals.rooms = result.rooms;
        res.locals.furniture = result.furniture;
        res.locals.categories = _.uniq(_.pluck(result.events, 'category'));
        res.locals.runs = result.runs;
        res.render('reports/rooms', { pageTitle: 'Room Report'});
    });
}

function getRoomData(req, cb){
    async.parallel({
        rooms: function(cb){
            req.intercode.getRooms(cb);
        },
        events: function(cb){
            req.intercode.getEvents(cb);
        },
        furniture: function(cb){
            req.models.furniture.list(cb);
        }
    }, function(err, result){
        if (err) { return cb(err); }
        furnitureHelper.getRunList(result.events, function(err, runs){
            if (err) { return cb(err); }
            result.rooms.forEach(function(room){
                room.requests = {};
                var roomRuns = runs.filter((run) => {
                    return _.findWhere(run.rooms, {id: room.id} )
                });

                roomRuns.forEach(function(run){
                    var category = run.event.category;

                    if (!_.has(room.requests, category)){
                        room.requests[category] = {};
                    }
                    result.furniture.forEach(function(item){
                        var itemCount = _.findWhere(run.requests, {furniture_id: item.id});

                        if (itemCount && (!room.requests[category][item.id] || itemCount.amount > room.requests[category][item.id])){
                            room.requests[category][item.id] = itemCount.amount
                        }
                    });
                });
            });
            result.runs = runs;
            cb(null, result);
        });
    });
}


var router = express.Router();
router.use(furnitureHelper.setSection('reports'));
router.use(permission('con_com'));

router.get('/', function(req, res, next){
    res.redirect('/reports/list');
})

router.get('/list', list);
router.get('/rooms', rooms);

module.exports = router;

