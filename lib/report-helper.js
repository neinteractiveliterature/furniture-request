'use strict';
const _ = require('underscore');
const csv = require('csv');
const moment = require('moment');
const async = require('async');
const furnitureHelper = require('./furniture-helper');

exports.getBreadcrumbs = function(reportName){
    return {
        path: [
            { url: '/', name: 'Home'},
            { url: '/reports', name: 'Reports'},
        ],
        current: reportName
    };
};

exports.getRequestCSV = function(runs, cb){
    const data = [['Event', 'Type', 'Run', 'Room(s)', 'Request']];
    _.sortBy(runs, 'starts_at').forEach(function(run){
        data.push([
            run.event.title,
            furnitureHelper.humanize(run.event.event_category.name),
            moment(run.starts_at).format('ddd, h:mm A'),
            _.pluck(run.rooms, 'name').join(', '),
            run.request
        ]);
    });
    csv.stringify(data, cb);
};

exports.getRequestData = function(req, type, cb){
    req.models.runs.list(function(err, runs){
        if (err) { return cb(err); }
        const filteredRuns = runs.filter((run) => { return run[type]; } );
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
};

exports.getRoomData = function(){
    const req = arguments[0];
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
                const roomRuns = runs.filter((run) => {
                    return _.findWhere(run.rooms, {id: room.id} );
                });
                room.runs = roomRuns;
                
                roomRuns.forEach(function(run){
                    const category = run.event.category;
                    
                    if (!_.has(room.requests, category)){
                        room.requests[category] = {};
                    }
                    result.furniture.forEach(function(item){
                        const itemCount = _.findWhere(run.requests, {furniture_id: item.id});

                        if (itemCount && (!room.requests[category][item.id] || itemCount.amount > room.requests[category][item.id])){
                            room.requests[category][item.id] = itemCount.amount;
                        }
                    });
                });
            });
            cb(null, result);
        });
    });
};
