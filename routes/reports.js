'use strict';
const express = require('express');
const async = require('async');
const _ = require('underscore');
const csv = require('csv');
const moment = require('moment');
const permission = require('../lib/permission');
const furnitureHelper = require('../lib/furniture-helper');
const reportHelper = require('../lib/report-helper');

function listReports(req, res){
    res.render('reports/index', {pageTitle: 'Furniture Reports'});
}

async function listReport(req, res, next){
    try {
        const events = await req.intercode.getEvents();
        furnitureHelper.getRunList(events, function(err, runs){
            if (err) { return next(err); }
            res.locals.runs = _.sortBy(runs, 'starts_at');
            if (req.query.export){
                const data = [['Event', 'Type', 'Run', 'Room(s)', 'Modified', 'Request Entered']];
                _.sortBy(runs, 'starts_at').forEach(function(run){
                    if (run.event.category === 'Volunteer event') { return; }
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
                    res.attachment('RunsExport.csv');
                    return res.end(output);
                });
            } else {
                res.locals.breadcrumbs = reportHelper.getBreadcrumbs('Runs List');
                res.locals.runs = _.sortBy(runs, 'starts_at');
                res.render('reports/list', { pageTitle: 'All Furniture Requests' });
            }
        });
    } catch (err) {
        next(err);
    }
}

function roomsReport(req, res, next){
    reportHelper.getRoomData(req, function(err, result){
        if (err) { return next(err); }
        const categories = _.uniq(_.pluck(_.pluck(result.events, 'event_category'), 'name'));
        if (req.query.export){
            const data = [];
            const header = ['Room', 'Category'];
            result.furniture.forEach(function(item){
                header.push(item.name);
            });
            data.push(header);
            _.sortBy(result.rooms, 'name').forEach(function(room){
                categories.forEach(function(category){
                    if (_.has(room.requests, category)){
                        const row = [room.name, category];
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
            res.locals.breadcrumbs = reportHelper.getBreadcrumbs('Room Report');
            res.render('reports/roomsSummary', { pageTitle: 'Room Report'});
        }
    });
}

function roomList(req, res, next){
    const roomId = Number(req.params.id);
    reportHelper.getRoomData(req, roomId, function(err, result){
        if (err) { return next(err); }
        const room = _.findWhere(result.rooms, {id: roomId});
        const categories = _.uniq(_.pluck(_.pluck(result.events, 'event_category'), 'name'));
        if (req.query.export){
            const data = [];
            const header = ['Event', 'Type', 'Run'];
            result.furniture.forEach(function(item){
                header.push(item.name);
            });
            header.push('Requested');
            data.push(header);

            _.sortBy(room.runs, 'starts_at').forEach(function(run){
                const row = [
                    run.event.title,
                    furnitureHelper.humanize(run.event.category),
                    moment(run.starts_at).format('ddd, h:mm A')
                ];
                result.furniture.forEach(function(item){
                    const count = _.findWhere(run.requests, {furniture_id: item.id}) ?
                        _.findWhere(run.requests, {furniture_id: item.id}).amount : 0;
                    row.push(count);
                });
                row.push((run.no_furniture || run.requests.length)?'Yes':'No');
                data.push(row);
            });

            categories.forEach(function(category){
                if (_.has(room.requests, category)){
                    const row = [
                        'Maximum',
                        furnitureHelper.humanize(category),
                        null,
                    ];
                    result.furniture.forEach(function(item){
                        row.push(room.requests[category][item.id]||0);
                    });
                    row.push(null);
                    data.push(row);
                }
            });
            csv.stringify(data, function(err, output){
                if (err) { return next(err); }
                res.attachment('RoomExport - '+ room.name + '.csv');
                return res.end(output);
            });
        } else {
            res.locals.room = room;
            res.locals.furniture = result.furniture;
            res.locals.categories = categories;
            res.locals.breadcrumbs = reportHelper.getBreadcrumbs(room.name);
            res.locals.breadcrumbs.path.push({url:'/reports/rooms', name: 'Rooms'});
            res.render('reports/room', { pageTitle: room.name});
        }
    });

}



function foodReport(req, res, next){
    reportHelper.getRequestData(req, 'food', function(err, runs){
        if (err) { return next(err); }
        if (req.query.export){
            reportHelper.getRequestCSV(runs, function(err, output){
                if (err) { return next(err); }
                res.attachment('FoodExport.csv');
                return res.end(output);
            });
        } else {
            res.locals.runs = runs;
            res.locals.breadcrumbs = reportHelper.getBreadcrumbs('Food Report');
            res.render('reports/specialRequests', { pageTitle: 'Food Report' });
        }
    });
}

function specialRequestsReport(req, res, next){
    reportHelper.getRequestData(req, 'notes', function(err, runs){
        if (err) { return next(err); }
        if (req.query.export){
            reportHelper.getRequestCSV(runs, function(err, output){
                if (err) { return next(err); }
                res.attachment('SpecialRequestsExport.csv');
                return res.end(output);
            });
        } else {
            res.locals.runs = runs;
            res.locals.breadcrumbs = reportHelper.getBreadcrumbs('Special Requests Report');
            res.render('reports/specialRequests', { pageTitle: 'Special Requests Report' });
        }
    });
}

function furnitureReportList(req, res, next){
    req.models.furniture.list(function(err, furniture){
        if (err) { return next(err); }
        res.locals.furniture = furniture;
        res.locals.breadcrumbs = reportHelper.getBreadcrumbs('Furniture Reports');
        res.render('reports/furnitureList', { pageTitle: 'Furniture Reports' });
    });
}

function furnitureReport(req, res, next){
    const itemId = req.params.id;
    async.parallel({
        requests: function(cb){
            req.models.requests.listByItem(itemId, cb);
        },
        events: function(cb){
            req.intercode.getEvents()
                .then((events) => cb(null, events))
                .catch((err) => cb(err));
        },
        furniture: function(cb){
            req.models.furniture.get(itemId, cb);
        }
    }, function(err, result){
        if (err) { return next(err); }
        const requests = result.requests.filter(request => {
            return findRun(result.events, request.run_id);
        }).map(request => {
            const event = findRun(result.events, request.run_id);
            const run = _.findWhere(event.runs, {id: request.run_id});
            request.event = event;
            request.run = run;
            return request;
        });
        if (req.query.export){
            const data = [['Event', 'Type', 'Run', 'Room', 'Amount']];
            requests.forEach(function(request){
                data.push([
                    request.event.title,
                    furnitureHelper.humanize(request.event.event_category.name),
                    moment(request.run.starts_at).format('ddd, h:mm A'),
                    _.findWhere(request.run.rooms, {id: request.room_id}).name,
                    request.amount
                ]);
            });
            csv.stringify(data, function(err, output){
                if (err) { return next(err); }
                res.attachment('Furniture Usage - '+ result.furniture.name + '.csv');
                return res.end(output);
            });

        } else {
            res.locals.requests = requests;
            res.locals.breadcrumbs = reportHelper.getBreadcrumbs(result.furniture.name);
            res.locals.breadcrumbs.path.push({url:'/reports/furniture', name: 'Furniture Reports'});
            res.render('reports/furniture', { pageTitle: result.furniture.name + ' Usage Report' });
        }
    });
}

function findRun(events, runId){
    for (let i = 0; i < events.length; i++){
        for (let j = 0; j < events[i].runs.length; j++){
            if (events[i].runs[j].id === runId){
                return events[i];
            }
        }
    }
}

const router = express.Router();
router.use(furnitureHelper.setSection('reports'));
router.use(permission('Con Com'));

router.get('/', listReports);
router.get('/list', listReport);
router.get('/rooms', roomsReport);
router.get('/rooms/:id', roomList);
router.get('/food', foodReport);
router.get('/special', specialRequestsReport);
router.get('/furniture', furnitureReportList);
router.get('/furniture/:id', furnitureReport);

module.exports = router;

