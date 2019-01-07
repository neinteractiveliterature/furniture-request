var config = require('config');
var GraphQLClient = require('graphql-request').GraphQLClient;
var _ = require('underscore');
//var passport = require(passport);

function Intercode(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
}

Intercode.prototype.getProfile = function(cb){

    var query = `{
        myProfile {
            id
            name_without_nickname
            email
            user {
                id
            }
        }
    }`
    request(this.accessToken, query, cb);
}


Intercode.prototype.getPermissions = function(id, cb){

    var query = `query getPermissions($id: Int!) {
        userConProfile(id: $id) {
            id
            privileges
        }
    }`
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.userConProfile.privileges);
    });
}


Intercode.prototype.getSignups = function(id, cb){
    var query = `query getSignups($id: Int!) {
        userConProfile(id: $id) {
            signups {
                id
                state
                bucket_key
                counted

                run {
                    id
                    starts_at
                    ends_at

                    rooms {
                        id
                        name
                    }

                    event {
                        id
                        title
                        length_seconds
                        category
                        team_member_name
                        team_members {
                            id
                            display
                            user_con_profile {
                                id
                                name_without_nickname
                                email
                            }
                        }
                    }
                }
            }
        }
    }`
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.userConProfile.signups);
    });
}

Intercode.prototype.getMemberEvents = function(id, cb){
    var query = ` query getSignups($id: Int!) {
        userConProfile(id: $id) {
            team_members {
                id
                display

                event {
                    id
                    title
                    length_seconds
                    category
                    team_member_name

                    runs {
                        id
                        starts_at
                        ends_at
                        rooms {
                            id
                            name
                        }
                   }
                   team_members {
                        id
                        display
                        user_con_profile {
                            id
                            name_without_nickname
                            email
                        }
                    }
                }
            }
        }
    }`
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        return cb(null, _.pluck(result.userConProfile.team_members, 'event'));
    });
}

Intercode.prototype.getEvent = function(id, cb){
    var query = `query getEvent($id: Int!) {
        event(id: $id) {
            id
            title
            length_seconds
            category
            team_member_name

            runs {
                id
                starts_at
                ends_at
                rooms {
                    id
                    name
                }
            }

            team_members {
                id
                display
                user_con_profile {
                    id
                    name_without_nickname
                    email
                }
            }
        }
    }`
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.event);
    });
}

Intercode.prototype.getRun = function(eventId, runId, cb){
    var query = `query getRun($eventId: Int!, $runId: Int!) {
        event(id: $eventId) {
            run(id: $runId) {
                id
                starts_at
                ends_at

                rooms {
                    id
                    name
                }

                event {
                    id
                    title
                    length_seconds
                    category
                    team_member_name
                    team_members {
                        id
                        display
                        user_con_profile {
                            id
                            name_without_nickname
                            email
                        }
                    }
                }
            }
        }
    }`
    var variables = {
        eventId: eventId,
        runId: runId,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.event.run);
    });
}

Intercode.prototype.getEvents = function(cb){
    var query = `{
        events {
            id
            title
            category
            length_seconds
            team_member_name
            runs {
                id
                starts_at
                ends_at
                rooms {
                        id
                        name
                    }
            }
            team_members {
                id
                display
                user_con_profile {
                    id
                    name_without_nickname
                    email
                }
            }
        }
    }`
    request(this.accessToken, query, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.events);
    });
}

Intercode.prototype.getConvention = function(cb){
    var query = `{
        convention {
            id
            name
            starts_at
            ends_at
        }
    }`
    request(this.accessToken, query, cb);
}

Intercode.prototype.getRooms = function(cb){
    var query = `{
        convention {
            rooms {
                id
                name
            }
        }
    }`
    request(this.accessToken, query, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.convention.rooms);
    });
}

Intercode.prototype.request = function(){
    arguments.unshift(this.accessToken);
    request.call(arguments);
}

function request(){
    var token = arguments[0];
    var query = arguments[1];
    var cb = null;
    var variables = {};
    if (typeof arguments[2] === 'object'){
        variables = arguments[2];
        cb = arguments[3];
    } else {
        cb = arguments[2];
    }
    const client = getClient(token);
    client.request(query, variables)
        .then(
            (data) => { return cb(null, data) },
            (err) => { return cb(err) }
            );
}

function getClient(token) {
    return new GraphQLClient(
        config.get('app.graphqlURL'),
        {
            headers: {
                Authorization: 'Bearer ' + token
            },
        });
}

module.exports = Intercode;
