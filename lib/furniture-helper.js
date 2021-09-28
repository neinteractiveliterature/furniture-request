'use strict';
const _ = require('underscore');
const pluralize = require('pluralize');


const models = {
    runs: require('../models/runs'),
    requests: require('../models/requests')
};

async function getRunList(events) {
    const runsWithEvent = events.flatMap((event) => event.runs.map((run) => ({
        ...run,
        event: {
            id: event.id,
            title: event.title,
            category: event.event_category.name,
            length_seconds: event.length_seconds,
            team_member_name: event.event_category.team_member_name,
            team_members: getTeamMembers(event.team_members)
        },
    })));
    const [dbRuns, dbRequests] = await Promise.all([
        models.runs.getMultiple(runsWithEvent.map((run) => run.id)),
        models.requests.getMultipleByRunId(runsWithEvent.map((run) => run.id)),
    ]);
    return runsWithEvent.map((run, index) => fillRunDetails(dbRuns[index], dbRequests[index], run));
}

function fillRunDetails(run, requests, incompleteRunData){
    const modified = findLatest(run?.modified, requests);

    if (run) {
        return {
            ...incompleteRunData,
            requests,
            notes: run.notes,
            food: run.food,
            no_furniture: run.no_furniture,
            modified,
        };
    } else {
        return {
            ...incompleteRunData,
            requests,
            notes: null,
            food: null,
            no_furniture: false,
            modified,
        };
    }
}

function humanize(str){
    str = str.replace(/_/, ' ');
    const lower = String(str).toLowerCase();
    return lower.replace(/(^| )(\w)/g, function(x) {
        return x.toUpperCase();
    });
}

function teamMembers(event){
    let str = humanize(event.event_category.team_member_name);
    const team_members = getTeamMembers(event.team_members);
    if (team_members.length !== 1){
        str = pluralize(str);
    }
    str += ': ';

    str += _.pluck(team_members, 'name_without_nickname').join(', ');
    return str;
}

function getTeamMembers(members){
    const team_members = _.where(members, {display_team_member:true});
    return _.pluck(team_members, 'user_con_profile');
}

function setSection(section){
    return function(req, res, next){
        res.locals.siteSection = section;
        next();
    };
}

function findLatest(time, requests){
    if (!time){
        time = new Date(0);
    }
    requests.forEach(function(request){
        if (new Date(request.created) > time){
            time = new Date(request.created);
        }
    });
    return time;
}

module.exports = {
    getRunList: getRunList,
    humanize: humanize,
    setSection: setSection,
    teamMembers: teamMembers
};
