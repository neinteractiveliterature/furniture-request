var express = require('express');
var async = require('async');
var csrf = require('csurf');
var _ = require('underscore');
var moment = require('moment');
var permission = require('../lib/permission');
var funitureHelper = require('../lib/furniture-helper');

var paths = {
    list: {
        path: [
            { url: '/reports', name: 'Reports' },
            { url: '/reports/list', name: 'List' }
        ],
        backto: '/reports/list'
    }
}

function list(req, res, next){
    res.locals.breadcrumbs = {
        path: [],
        current: 'Home'
    };
    req.intercode.getMemberEvents( req.user.intercode_id, function(err, data){
        if (err) { return next(err); }
        funitureHelper.getRunList(data, function(err, runs){
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
                res.render('requests/index', {pageTitle: 'Requests for ' + req.user.name});
            });
        });
    });
}

function show(req, res, next){
    var runId = Number(req.params.runId);
    var eventId = Number(req.params.eventId);
    var backto = req.query.backto;

    async.parallel({
        intercode: function(cb){
            req.intercode.getRun(eventId, runId, cb);
        },
        local: function(cb){
            req.models.runs.get(runId, cb);
        },
        furniture: function(cb){
            req.models.furniture.list(cb);
        },
        requests: function(cb){
            req.models.requests.listByRun(runId, cb);
        }
    }, function(err, result){
        if (err) { return next(err); }
        res.locals.run = result.intercode;
        if (result.local){
            res.locals.run.notes = result.local.notes;
            res.locals.run.food = result.local.food;
            res.locals.run.no_furniture = result.local.no_furniture;
        }
        res.locals.furniture = result.furniture || [];;
        if (_.has(req.session, 'requestsData')){
            res.locals.requests = req.session.requestsData;
            res.locals.run.notes = req.session.requestsData.run.notes;
            res.locals.run.food = req.session.requestsData.run.food;
            delete req.session.requestsData;
        } else {
            var requests = {};
            result.intercode.rooms.forEach(function(room){
                requests['room-'+room.id] = {
                    furniture: {},
                    no_furniture:false,
                };
                result.furniture.forEach(function(item){
                    var request = _.findWhere(result.requests, {
                        room_id: room.id,
                        furniture_id:item.id
                    });
                    if (request){
                        requests['room-'+room.id].furniture['item-'+item.id] = request.amount;
                    } else {
                        requests['room-'+room.id].furniture['item-'+item.id] = null;
                    }
                });
            });
            res.locals.requests = requests;
        }
        res.locals.csrfToken = req.csrfToken();
        res.locals.breadcrumbs = {
           path: [
                { url: '/', name: 'Home'},
            ],
            current: res.locals.run.event.title + ' ' + moment(res.locals.run.starts_at).format('ddd, h:mm A')
        };
        if (backto && _.has(paths, backto)){
            res.locals.backto = paths[backto].backto;
            res.locals.breadcrumbs.path = res.locals.breadcrumbs.path.concat(paths[backto].path);
        }

        res.render('requests/show', {pageTitle: {
            h2: res.locals.run.event.title,
            h3: moment(res.locals.run.starts_at).format('ddd, h:mm A'),
            h4: funitureHelper.teamMembers(res.locals.run.event)
        }});
    });
}

function saveRequest(req, res, next){
    var runId = Number(req.params.runId);
    var eventId = Number(req.params.eventId);
    var requests = req.body.requests;
    var runData = req.body.run;

    req.session.requestsData = requests;
    req.session.requestsData.run = runData;
    async.parallel({
        run: function(cb){
            no_furniture = true;
            _.keys(requests).forEach(function(room){
                if (room.match(/^room-/) && !requests[room].no_furniture){
                    no_furniture = false;
                }
            });

            req.models.runs.get(runId, function(err, run){
                if (err) { return cb(err); }
                if (run){
                    run.notes = runData.notes;
                    run.food = runData.food;
                    run.created_by = req.user.id;
                    run.no_furniture = no_furniture
                    req.models.runs.update(runId, run, cb);
                } else if (runData.notes || runData.food || no_furniture){
                    req.models.runs.create({
                        id: runId,
                        event_id: eventId,
                        notes: runData.notes,
                        food: runData.food,
                        no_furniture: no_furniture,
                        created_by: req.user.id
                    }, cb);
                } else {
                    cb();
                }
            });
        },
        requests: function(cb){
            async.each(_.keys(requests), function(room, cb){
                var roomId = Number(room.replace(/^room-/,''));
                async.each(_.keys(requests[room].furniture), function(item, cb){
                    var furnitureId = Number(item.replace(/^item-/, ''));
                    var amount = Number(requests[room].furniture[item]);
                    req.models.requests.find(runId, roomId, furnitureId, function(err, request){
                        if (err) { return cb(err); }
                        if (request){
                            if(!amount || requests[room].no_furniture){
                                return req.models.requests.delete(request.id, cb);
                            } else if (amount || amount !== request.amount){
                                request.amount = amount;
                                request.created_by = req.user.id;
                                return req.models.requests.update(request.id, request, cb);
                            } else {
                                cb();
                            }
                        } else if (amount && !requests[room].no_furniture){
                            var request = {
                                run_id: runId,
                                room_id: roomId,
                                furniture_id: furnitureId,
                                amount: amount,
                                created_by: req.user.id
                            };
                            return req.models.requests.create(request, cb);
                        } else {
                            cb();
                        }
                    });
                }, cb);
            }, cb);
        }
    }, function(err){
        if (err) {
            req.flash('error', err.toString())
            return res.redirect('/requests/'+eventId+'/'+runId);
        }
        delete req.session.requestsData;
        req.flash('success', 'Saved Request');
        if (req.body._backto){
            res.redirect(req.body._backto);
        } else {
            res.redirect('/requests');
        }
    });
}

function isTeamMemberOrGMLiaison(req, res, next){
    var eventId = Number(req.params.eventId);
    permission({permission: 'gm_liaison', eventId:eventId}, '/requests')(req, res, next);
}
function isTeamMemberOrConcom(req, res, next){
    var eventId = Number(req.params.eventId);
    permission({permission: 'con_com', eventId:eventId}, '/requests')(req, res, next);
}


var router = express.Router();
router.use(funitureHelper.setSection('requests'));
router.use(permission('login'));

router.get('/', list);
router.get('/:eventId/:runId', isTeamMemberOrConcom, csrf(), show);
router.put('/:eventId/:runId', isTeamMemberOrGMLiaison, csrf(), saveRequest);

module.exports = router;

