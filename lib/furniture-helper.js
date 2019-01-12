'use strict';
var async = require('async');
var _ = require('underscore');
var pluralize = require('pluralize');


var models = {
    runs: require('../models/runs'),
    requests: require('../models/requests')
};

function getRunList(events, cb){
    var runs = [];
    async.each(events, function(event, cb){
        async.each(event.runs, function(run, cb){
            run.event = {
                id: event.id,
                title: event.title,
                category: event.category,
                length_seconds: event.length_seconds,
                team_member_name: event.team_member_name,
                team_members: getTeamMembers(event.team_members)
            };
            fillRunDetails(run, function(err, run){
                if (err) { return cb(err); }
                runs.push(run);
                cb();
            });
        }, cb);
    }, function(err){
        if (err) { return cb(err); }
        cb(null, runs);
    });
}

function fillRunDetails(run, cb){
    async.parallel({
        run: function(cb){
            models.runs.get(run.id, cb);
        },
        requests: function(cb){
            models.requests.listByRun(run.id, cb);
        }
    }, function(err, result){
        if (err) { return cb(err); }
        run.requests = result.requests || [] ;
        if (result.run){
            run.notes = result.run.notes;
            run.food = result.run.food;
            run.no_furniture = result.run.no_furniture;
            run.modified = new Date(result.run.created);
        } else {
            run.notes = null;
            run.food = null;
            run.no_furniture = false;
        }
        if (run.requests.length){
            run.modified = findLatest(run.modified, run.requests);
        }
        cb(null, run);
    });
}

function findRunsByRoom(runs, roomId){
    return runs.filter(function(run){
        return _.findWhere(run.rooms, {id: roomId});
    });
}

function humanize(str){
    str = str.replace(/_/, ' ');
    var lower = String(str).toLowerCase();
    return lower.replace(/(^| )(\w)/g, function(x) {
        return x.toUpperCase();
    });
}

function teamMembers(event){
    var str = humanize(event.team_member_name);
    var team_members = getTeamMembers(event.team_members);
    if (team_members.length !== 1){
        str = pluralize(str);
    }
    str += ': ';

    str += _.pluck(team_members, 'name_without_nickname').join(', ');
    return str;
}

function getTeamMembers(members){
    var team_members = _.where(members, {display:true});
    return _.pluck(team_members, 'user_con_profile');
}

function setSection(section){
    return function(req, res, next){
        res.locals.siteSection = section;
        next();
    };
}

function runSorter(a, b){
    return new Date(b.starts_at) - new Date(a.starts_at);
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
    fillRunDetails: fillRunDetails,
    humanize: humanize,
    setSection: setSection,
    teamMembers: teamMembers
};
