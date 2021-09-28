'use strict';
const _ = require('underscore');
const csv = require('csv');
const moment = require('moment');
const furnitureHelper = require('./furniture-helper');

exports.getBreadcrumbs = function(reportName) {
    return {
        path: [
            { url: '/', name: 'Home'},
            { url: '/reports', name: 'Reports'},
        ],
        current: reportName
    };
};

exports.getRequestCSV = function(runs) {
    // csv uses a callback API; let's wrap it in a promise
    return new Promise((resolve, reject) => {
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
        csv.stringify(data, (err, output) => {
            if (err) {
                reject(err);
            } else {
                resolve(output);
            }
        });
    });
};

exports.getRequestData = async function(req, type){
    const runs = await req.models.runs.list();
    const runsWithRequest = runs.filter((run) => { return run[type]; } );
    const runsWithRequestById = new Map(
        runsWithRequest.map((runWithRequest) => [runWithRequest.id, runWithRequest])
    );
    const remoteRunData = await Promise.all(
        runsWithRequest.map((run) => req.intercode.getRun(run.event_id, run.id))
    );
    return await Promise.all(remoteRunData.map(async (remoteRun) => {
        const runRequest = runsWithRequestById.get(remoteRun.id);
        return {
            ...remoteRun,
            request: runRequest[type],
            no_furniture: runRequest.no_furniture,
            created_by: await req.models.user.get(runRequest.created_by),
        };
    }));
};

exports.getRoomData = async function(req, roomId = undefined) {
    const [rooms, events, furniture] = await Promise.all([
        req.intercode.getRooms(),
        req.intercode.getEvents(),
        req.models.furniture.list(),
    ]);
    const runs = await furnitureHelper.getRunList(events);

    const roomsWithData = rooms.map((room) => {
        if (roomId && room.id !== roomId){
            return room;
        }

        const roomRequests = {};
        const roomRuns = runs.filter((run) => _.findWhere(run.rooms, { id: room.id }));
        roomRuns.forEach((run) => {
            const category = run.event.category;
            if (!_.has(roomRequests, category)){
                roomRequests[category] = {};
            }
            furniture.forEach((item) => {
                const itemCount = _.findWhere(run.requests, {furniture_id: item.id});
                if (itemCount && (!roomRequests[category][item.id] || itemCount.amount > roomRequests[category][item.id])){
                    roomRequests[category][item.id] = itemCount.amount;
                }
            });
        });

        return {
            ...room,
            requests: roomRequests,
            runs: roomRuns,
        };
    });

    return {
        rooms: roomsWithData,
        events,
        furniture,
    };
};
