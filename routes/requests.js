'use strict';
const PromiseRouter = require('express-promise-router');
const csrf = require('csurf');
const _ = require('underscore');
const moment = require('moment');
const permission = require('../lib/permission');
const furnitureHelper = require('../lib/furniture-helper');
const async = require('async');

const paths = {
    list: {
        path: [
            { url: '/reports', name: 'Reports' },
            { url: '/reports/list', name: 'List' }
        ],
        backto: '/reports/list'
    }
};

async function list(req, res){
    res.locals.breadcrumbs = {
        path: [],
        current: 'Home'
    };
    const data = await req.intercode.getMemberEvents( req.user.intercode_id);
    const runs = await furnitureHelper.getRunList(data);
    res.locals.runs = _.sortBy(runs, 'starts_at');
    const requestNote = await req.models.display_text.getByName('requestIndex');
    res.locals.requestIndexNote = furnitureHelper.renderText(requestNote.content, res);
    const convention = await req.intercode.getConvention();
    res.render('requests/index', {pageTitle: `${convention.name} Requests for ${req.user.name}`});
}

async function show(req, res){
    const runId = req.params.runId;
    const eventId = req.params.eventId;
    const backto = req.query.backto;

    const { intercodeRun, localRun, furniture, furnitureTree, requests, requestShowNote, requestFoodNote, requestSpecialNote } = await async.parallel({
        intercodeRun: async () => await req.intercode.getRun(eventId, runId),
        localRun: async () => await req.models.runs.get(runId),
        furniture: async() => await req.models.furniture.list(),
        furnitureTree: async () => await furnitureHelper.getFurnitureTree(),
        requests: async () => await req.models.requests.listByRun(runId),
        requestShowNote: async () => await req.models.display_text.getByName('requestShow'),
        requestFoodNote: async () => await req.models.display_text.getByName('requestFood'),
        requestSpecialNote: async () => await req.models.display_text.getByName('requestSpecial')
    });
    res.locals.run = intercodeRun;
    res.locals.requests = requests;

    if (localRun){
        res.locals.run.notes = localRun.notes;
        res.locals.run.food = localRun.food;
        res.locals.run.no_furniture = localRun.no_furniture;
    }
    res.locals.furniture = furnitureTree || [];

    if (_.has(req.session, 'requestsData')){
        res.locals.requests = req.session.requestsData;
        res.locals.run.notes = req.session.requestsData.run.notes;
        res.locals.run.food = req.session.requestsData.run.food;
        delete req.session.requestsData;
    } else {
        const requestsForView = {};
        intercodeRun.rooms.forEach(function(room){
            requestsForView[`room-${room.id}`] = {
                furniture: {},
                no_furniture:false,
            };
            furniture.forEach(function(item){
                const request = _.findWhere(requests, {
                    room_id: room.id,
                    furniture_id:item.id
                });
                if (request){
                    requestsForView[`room-${room.id}`].furniture[`item-${item.id}`] = request.amount;
                } else {
                    requestsForView[`room-${room.id}`].furniture[`item-${item.id}`] = null;
                }
            });
        });
        res.locals.requests = requestsForView;
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

    res.locals.displayNotes = {
        show: furnitureHelper.renderText(requestShowNote.content, res),
        food: furnitureHelper.renderText(requestFoodNote.content, res),
        special: furnitureHelper.renderText(requestSpecialNote.content, res)
    };

    res.render('requests/show', {pageTitle: {
        h2: res.locals.run.event.title,
        h3: moment(res.locals.run.starts_at).format('ddd, h:mm A'),
        h4: furnitureHelper.teamMembers(res.locals.run.event)
    }});
}

async function saveRunRequest(req, requests, runId, eventId, runData) {
    let no_furniture = true;
    _.keys(requests).forEach(function(room){
        if (room.match(/^room-/) && !requests[room].no_furniture){
            no_furniture = false;
        }
    });
    const run = await req.models.runs.get(runId);
    if (run) {
        run.notes = runData.notes;
        run.food = runData.food;
        run.updated_by = req.user.id;
        run.no_furniture = no_furniture;
        await req.models.runs.update(runId, run);
    } else if (runData.notes || runData.food || no_furniture){
        await req.models.runs.create({
            id: runId,
            event_id: eventId,
            notes: runData.notes,
            food: runData.food,
            no_furniture: no_furniture,
            created_by: req.user.id
        });
    }
}

async function saveRoomFurnitureRequest(req, runId, roomId, furnitureId, amount, noFurniture, runRequests) {
    const request = runRequests.find((request) => request.room_id === roomId && request.furniture_id === furnitureId);
    if (request){
        if(!amount || noFurniture){
            await req.models.requests.delete(request.id);
        } else if (amount || amount !== request.amount){
            request.amount = amount;
            request.created_by = req.user.id;
            await req.models.requests.update(request.id, request);
        }
    } else if (amount && !noFurniture){
        const request = {
            run_id: runId,
            room_id: roomId,
            furniture_id: furnitureId,
            amount: amount,
            created_by: req.user.id
        };
        await req.models.requests.create(request);
    }
}

async function saveRoomRequest(req, runId, roomId, roomRequest, runRequests) {
    await async.each(_.keys(roomRequest.furniture), async (furnitureKey) => {
        const furnitureId = Number(furnitureKey.replace(/^item-/, ''));
        await saveRoomFurnitureRequest(
            req,
            runId,
            roomId,
            furnitureId,
            Number(roomRequest.furniture[furnitureKey]),
            roomRequest.no_furniture,
            runRequests,
        );
    });
}

async function saveRequest(req, res){
    const runId = req.params.runId;
    const eventId = req.params.eventId;
    const requests = req.body.requests;
    const runData = req.body.run;

    req.session.requestsData = requests ?? {};
    req.session.requestsData.run = runData;
    const runRequests = await req.models.requests.listByRun(runId);
    try {
        await async.parallel([
            async () => await saveRunRequest(req, requests, runId, eventId, runData),
            async () => await async.each(_.keys(requests), async (roomKey) => {
                const roomId = roomKey.replace(/^room-/,'');
                await saveRoomRequest(req, runId, roomId, requests[roomKey], runRequests);
            }),
        ]);
    } catch (err) {
        req.flash('error', err.toString());
        return res.redirect('/requests/'+eventId+'/'+runId);
    }

    delete req.session.requestsData;
    req.flash('success', 'Saved Request');
    if (req.body._backto){
        res.redirect(req.body._backto);
    } else {
        res.redirect('/requests');
    }
}

function isTeamMemberOrGMLiaison(req, res, next){
    const eventId = req.params.eventId;
    permission({permission: 'GM Coordinator', eventId:eventId}, '/requests')(req, res, next);
}
function isTeamMemberOrConcom(req, res, next){
    const eventId = req.params.eventId;
    permission({permission: 'Con Com', eventId:eventId}, '/requests')(req, res, next);
}


const router = PromiseRouter();
router.use(furnitureHelper.setSection('requests'));
router.use(permission('login'));

router.get('/', list);
router.get('/:eventId/:runId', isTeamMemberOrConcom, csrf(), show);
router.put('/:eventId/:runId', isTeamMemberOrGMLiaison, csrf(), saveRequest);

module.exports = router;

