var config = require('config');
var GraphQLClient = require('graphql-request').GraphQLClient;
var _ = require('underscore');
var { URL } = require('url');
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

Intercode.prototype.getUser = function(cb) {
    var query = gql`query getUser {
        currentUser {
            id
            name
            email
        }
    }`;
    request(this.accessToken, query, cb);
};


Intercode.prototype.getPermissions = function(userId, cb){

    var query = gql`query getPermissions($conventionDomain: String!, $userId: Int!) {
        user(id: $userId) {
            privileges
        }

        convention: conventionByDomain(domain: $conventionDomain) {
            user_con_profile_by_user_id(userId: $userId) {
                id
                staff_positions {
                    id
                    name
                }
            }
        }
    }`;
    var variables = {
        userId,
        conventionDomain: getConventionDomain()
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, {
            privileges: result.user.privileges,
            positions: _.pluck(result.convention.user_con_profile_by_user_id.staff_positions, 'name')
        });
    });
};


Intercode.prototype.getSignups = function(userId, cb){
    var query = gql`query getSignups($conventionDomain: String!, $userId: Int!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            user_con_profile_by_user_id(userId: $userId) {
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
                                team_member_name
                            }
                            team_members {
                                id
                                display_team_member
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
        }
    }`;
    var variables = {
        userId,
        conventionDomain: getConventionDomain()
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.convention.user_con_profile_by_user_id.signups);
    });
};

Intercode.prototype.getMemberEvents = function(userId, cb){
    var query = gql` query getMemberEvents($userId: Int!, $conventionDomain: String!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            user_con_profile_by_user_id(userId: $userId) {
                team_members {
                    id
                    display_team_member

                    event {
                        id
                        title
                        length_seconds
                        event_category {
                            name
                            team_member_name
                        }

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
                            display_team_member
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
        userId,
        conventionDomain: getConventionDomain(),
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, _.pluck(result.convention.user_con_profile_by_user_id.team_members, 'event'));
    });
};

Intercode.prototype.getEvent = function(id, cb){
    var query = gql`query getEvent($conventionDomain: String!, $id: Int!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            event(id: $id) {
                id
                title
                length_seconds
                event_category {
                    name
                    team_member_name
                }

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
                    display_team_member
                    user_con_profile {
                        id
                        name_without_nickname
                        email
                    }
                }
            }
        }
    }`;
    var variables = {
        conventionDomain: getConventionDomain(),
        id: id,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.convention.event);
    });
};

Intercode.prototype.getRun = function(eventId, runId, cb){
    var query = gql`query getRun($conventionDomain: String!, $eventId: Int!, $runId: Int!) {
        convention: conventionByDomain(domain: $conventionDomain) {
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
                            team_member_name
                        }
                        team_members {
                            id
                            display_team_member
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
        conventionDomain: getConventionDomain(),
        eventId: eventId,
        runId: runId,
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.convention.event.run);
    });
};

Intercode.prototype.getEvents = function(cb){
    var query = gql`query getEvents($conventionDomain: String!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            events {
                id
                title
                event_category {
                    name
                    team_member_name
                }
                length_seconds
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
                    display_team_member
                    user_con_profile {
                        id
                        name_without_nickname
                        email
                    }
                }
            }
        }
    }`;
    var variables = {
        conventionDomain: getConventionDomain()
    };
    request(this.accessToken, query, variables, function(err, result){
        if (err) { return cb(err); }
        if (!result) return cb();
        return cb(null, result.convention.events);
    });
};

Intercode.prototype.getConvention = function(cb){
    var query = gql`query getConvention($conventionDomain: String!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            id
            name
            starts_at
            ends_at
        }
    }`;
    request(this.accessToken, query, { conventionDomain: getConventionDomain() }, cb);
};

Intercode.prototype.getRooms = function(cb){
    var query = gql`query getRooms($conventionDomain: String!) {
        convention: conventionByDomain(domain: $conventionDomain) {
            rooms {
                id
                name
            }
        }
    }`;
    request(
        this.accessToken,
        query,
        { conventionDomain: getConventionDomain() },
        function(err, result){
            if (err) { return cb(err); }
            if (!result) return cb();
            return cb(null, result.convention.rooms);
        }
    );
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

function getConventionDomain() {
    return new URL(config.get('app.interconBaseURL')).hostname;
}

module.exports = Intercode;
