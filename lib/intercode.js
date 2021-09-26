var config = require('config');
var GraphQLClient = require('graphql-request').GraphQLClient;
var _ = require('underscore');
//var passport = require(passport);

function Intercode(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
}

// Stolen from the 3.x series of graphql-request.  This is a no-op tagged template function that
// exists just so that graphql-eslint can find the GraphQL template strings in this file for
// linting.
function gql(chunks, ...variables) {
    return chunks.reduce(
        (accumulator, chunk, index) => `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
        ''
    );
}

Intercode.prototype.getProfile = function(cb){

    var query = gql`query getProfile {
        myProfile {
            id
            name_without_nickname
            email
            user {
                id
            }
        }
    }`;
    request(this.accessToken, query, cb);
};


Intercode.prototype.getPermissions = function(id, cb){

    var query = gql`query getPermissions($id: Int!) {
        userConProfile(id: $id) {
            id
            privileges
            staff_positions {
                id
                name
            }
        }
    }`;
    console.log(query);
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, {
            privileges: result.userConProfile.privileges,
            positions: _.pluck(result.userConProfile.staff_positions, 'name')
        });
    });
};


Intercode.prototype.getSignups = function(id, cb){
    var query = gql`query getSignups($id: Int!) {
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
                        event_category {
                           name
                        }
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
    }`;
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.userConProfile.signups);
    });
};

Intercode.prototype.getMemberEvents = function(id, cb){
    var query = gql` query getSignups($id: Int!) {
        userConProfile(id: $id) {
            team_members {
                id
                display

                event {
                    id
                    title
                    length_seconds
                    event_category {
                        name
                    }
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
    }`;
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, _.pluck(result.userConProfile.team_members, 'event'));
    });
};

Intercode.prototype.getEvent = function(id, cb){
    var query = gql`query getEvent($id: Int!) {
        event(id: $id) {
            id
            title
            length_seconds
            event_category {
                name
            }
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
    }`;
    var variables = {
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.event);
    });
};

Intercode.prototype.getRun = function(eventId, runId, cb){
    var query = gql`query getRun($eventId: Int!, $runId: Int!) {
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
                    event_category {
                        name
                    }
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
    }`;
    var variables = {
        eventId: eventId,
        runId: runId,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.event.run);
    });
};

Intercode.prototype.getEvents = function(cb){
    var query = gql`query getEvents {
        events {
            id
            title
            event_category {
                name
            }
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
    }`;
    request(this.accessToken, query, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.events);
    });
};

Intercode.prototype.getConvention = function(cb){
    var query = gql`query getConvention {
        convention {
            id
            name
            starts_at
            ends_at
        }
    }`;
    request(this.accessToken, query, cb);
};

Intercode.prototype.getRooms = function(cb){
    var query = gql`query getRooms {
        convention {
            rooms {
                id
                name
            }
        }
    }`;
    request(this.accessToken, query, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.convention.rooms);
    });
};

Intercode.prototype.request = function(){
    arguments.unshift(this.accessToken);
    request.call(arguments);
};

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
            (data) => { return cb(null, data); },
            (err) => {
                if (err.toString().match(/Event not found/)){
                    return cb();
                }
                return cb(err);
            }
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
