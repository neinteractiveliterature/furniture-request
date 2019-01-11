var express = require('express');
var async = require('async');
var csrf = require('csurf');
var _ = require('underscore');
var csv = require('csv');
var moment = require('moment');
var permission = require('../lib/permission');
var furnitureHelper = require('../lib/furniture-helper');

function listReports(req, res, next){
    res.render('reports/index', {pageTitle: 'Furniture Reports'});
}

function listReport(req, res, next){
    req.intercode.getEvents(function(err, events){
        if (err) { return next(err); }
        furnitureHelper.getRunList(events, function(err, runs){
            if (err) { return next(err); }
            res.locals.runs = _.sortBy(runs, "starts_at");
            if (req.query.export){
                var data = [['Event', 'Type', 'Run', 'Room(s)', 'Modified', 'Request Entered']]
                _.sortBy(runs, "starts_at").forEach(function(run){
                    if (run.event.category === 'volunteer_event') { return; }
                    data.push([
                        run.event.title,
                        furnitureHelper.humanize(run.event.category),
                        moment(run.starts_at).format('ddd, h:mm A'),
                        _.pluck(run.rooms, 'name').join(', '),
                        moment(run.modified).format('YYYY-MM-DD h:mm A'),
                        (run.no_furniture || run.requests.length)?'Yes':'No'
                    ]);
                });
                csv.stringify(data, function(err, output){
                    if (err) { return next(err); }
                    res.attachment('FoodExport.csv');
                    return res.end(output);
                });
            } else {
                res.locals.breadcrumbs = getBreadcrumbs('List');
                res.locals.runs = _.sortBy(runs, "starts_at");
                res.render('reports/list', { pageTitle: 'All Furniture Requests' });
            }
        });
    });
}

function roomsReport(req, res, next){
    getRoomData(req, function(err, result){
        var categories = _.uniq(_.pluck(result.events, 'category'));
        if (req.query.export){
            var data = []
            var header = ['Room', 'Category'];
            result.furniture.forEach(function(item){
                header.push(item.name);
            });
            data.push(header);
            result.rooms.forEach(function(room){
                categories.forEach(function(category){
                    if (_.has(room.requests, category)){
                        var row = [room.name, category];
                        result.furniture.forEach(function(item){
                            row.push(room.requests[category][item.id]||0);
                        });
                        data.push(row);
                    }
                });
            });
            csv.stringify(data, function(err, output){
                if (err) { return next(err); }
                res.attachment('RoomsExport.csv');
                return res.end(output);
            });
        } else {
            res.locals.rooms = result.rooms;
            res.locals.furniture = result.furniture;
            res.locals.categories = categories;
            res.locals.breadcrumbs = getBreadcrumbs('Room Report');
            res.render('reports/roomsSummary', { pageTitle: 'Room Report'});
        }
    });
}

function roomList(req, res, next){
    var roomId = Number(req.params.id);
    getRoomData(req, roomId, function(err, result){
        var room = _.findWhere(result.rooms, {id: roomId});
        var categories = _.uniq(_.pluck(result.events, 'category'));
        res.locals.room = room;
        res.locals.furniture = result.furniture;
        res.locals.categories = categories;
        res.locals.breadcrumbs = getBreadcrumbs(room.name);
        res.locals.breadcrumbs.path.push({url:'/reports/rooms', name: 'Rooms'});
        res.render('reports/room', { pageTitle: room.name});
    });

}

function getRoomData(){
    var req = arguments[0];
    var cb = null;
    var roomId = null;
    if (typeof arguments[1] === 'number'){
        roomId = arguments[1];
        cb = arguments[2];
    } else {
        cb = arguments[1];
    }

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
                if (roomId && room.id !== roomId){
                    return;
                }
                room.requests = {};
                var roomRuns = runs.filter((run) => {
                    return _.findWhere(run.rooms, {id: room.id} )
                });
                room.runs = roomRuns;

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
            cb(null, result);
        });
    });
}

function foodReport(req, res, next){
    getRequestData(req, 'food', function(err, runs){
        if (err) { return next(err); }
        if (req.query.export){
            getRequestCSV(runs, function(err, output){
                if (err) { return next(err); }
                res.attachment('RunsExport.csv');
                return res.end(output);
            });
        } else {
            res.locals.runs = runs;
            res.locals.breadcrumbs = getBreadcrumbs('Food Report');
            res.render('reports/specialRequests', { pageTitle: 'Food Report' });
        }
    });
}

function specialRequestsReport(req, res, next){
    getRequestData(req, 'notes', function(err, runs){
        if (err) { return next(err); }
        if (req.query.export){
            getRequestCSV(runs, function(err, output){
                if (err) { return next(err); }
                res.attachment('SpecialRequestsExport.csv');
                return res.end(output);
            });
        } else {
            res.locals.runs = runs;
            res.locals.breadcrumbs = getBreadcrumbs('Special Requests Report');
            res.render('reports/specialRequests', { pageTitle: 'Special Requests Report' });
        }
    });
}

function getRequestData(req, type, cb){
    req.models.runs.list(function(err, runs){
        if (err) { return next(err); }
        var filteredRuns = runs.filter((run) => { return run[type] } );
        async.map(filteredRuns, function(runRequest, cb){
            req.intercode.getRun(runRequest.event_id, runRequest.id, function(err, run){
                if (err) { return cb(err); }
                run.request = runRequest[type];
                run.no_furniture = runRequest.no_furniture;
                req.models.user.get(runRequest.created_by, function(err, user){
                    if (err) { return cb(err); }
                    run.created_by = user;
                    cb(null, run);    
                });
            });
        }, cb);
    });
}

function getRequestCSV(runs, cb){
    var data = [['Event', 'Type', 'Run', 'Room(s)', 'Request']]
        _.sortBy(runs, "starts_at").forEach(function(run){
            data.push([
                run.event.title,
                furnitureHelper.humanize(run.event.category),
                moment(run.starts_at).format('ddd, h:mm A'),
                _.pluck(run.rooms, 'name').join(', '),
                run.request
            ]);
        });
        csv.stringify(data, cb);
}

function getBreadcrumbs(reportName){
    return {
        path: [
            { url: '/', name: 'Home'},
            { url: '/reports', name: 'Reports'},
        ],
        current: reportName
    }
}


var router = express.Router();
router.use(furnitureHelper.setSection('reports'));
router.use(permission('con_com'));

router.get('/', listReports);
router.get('/list', listReport);
router.get('/rooms', roomsReport);
router.get('/rooms/:id', roomList);
router.get('/food', foodReport);
router.get('/special', specialRequestsReport);

module.exports = router;

