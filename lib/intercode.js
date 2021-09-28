const config = require('config');
const GraphQLClient = require('graphql-request').GraphQLClient;
const _ = require('underscore');
const { URL } = require('url');
const c = require('ansi-colors');
// eslint-disable-next-line node/no-unpublished-require
const { parse } = require('graphql/language');
//var passport = require(passport);

// Stolen from the 3.x series of graphql-request.  This is a no-op tagged template function that
// exists just so that graphql-eslint can find the GraphQL template strings in this file for
// linting.
function gql(chunks, ...variables) {
    return chunks.reduce(
        (accumulator, chunk, index) => `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
        ''
    );
}

async function graphQLRequest(client, query, variables = undefined){
    try {
        const parsedQuery = parse(query);
        const queryName = parsedQuery.definitions[0].name?.value;
        const start = new Date();
        const result = await client.request(query, variables);
        console.log(`${c.green(`[GraphQL ${new Date().getTime() - start.getTime()}ms]`)} ${queryName} ${variables ? c.yellow(JSON.stringify(variables)) : ''}`);
        return result;
    } catch (err) {
        if (err.toString().match(/Event not found/)){
            return undefined;
        }
        throw err;
    }
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

class Intercode {
    constructor(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.client = getClient(this.accessToken);
    }

    request(query, variables = undefined) {
        return graphQLRequest(this.client, query, variables);
    }

    getUser() {
        const query = gql`query getUser {
            currentUser {
                id
                name
                email
            }
        }`;
        return this.request(query);
    }

    async getPermissions(userId) {

        const query = gql`query getPermissions($conventionDomain: String!, $userId: Int!) {
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
        const variables = {
            userId,
            conventionDomain: getConventionDomain()
        };
        const result = await this.request(query, variables);
        return {
            privileges: result.user.privileges,
            positions: _.pluck(result.convention.user_con_profile_by_user_id.staff_positions, 'name')
        };
    }

    async getMemberEvents(userId) {
        const query = gql`query getMemberEvents($userId: Int!, $conventionDomain: String!) {
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
        const variables = {
            userId,
            conventionDomain: getConventionDomain(),
        };
        const result = await this.request(query, variables);
        return _.pluck(result.convention.user_con_profile_by_user_id.team_members, 'event');
    }

    async getRun(eventId, runId) {
        const query = gql`query getRun($conventionDomain: String!, $eventId: Int!, $runId: Int!) {
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
        const variables = {
            conventionDomain: getConventionDomain(),
            eventId: eventId,
            runId: runId,
        };
        const result = await this.request(query, variables);
        return result.convention.event.run;
    }

    async getEvents() {
        const query = gql`query getEvents($conventionDomain: String!) {
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
        const variables = {
            conventionDomain: getConventionDomain()
        };
        const result = await this.request(query, variables);
        return result.convention.events;
    }

    async getRooms() {
        const query = gql`query getRooms($conventionDomain: String!) {
            convention: conventionByDomain(domain: $conventionDomain) {
                rooms {
                    id
                    name
                }
            }
        }`;
        const result = await this.request(query, { conventionDomain: getConventionDomain() });
        return result.convention.rooms;
    }
}


// TODO: possibly delete?  This is unused anywhere in the app
// Intercode.prototype.getSignups = async function(userId){
//     const query = gql`query getSignups($conventionDomain: String!, $userId: Int!) {
//         convention: conventionByDomain(domain: $conventionDomain) {
//             user_con_profile_by_user_id(userId: $userId) {
//                 signups {
//                     id
//                     state
//                     bucket_key
//                     counted

//                     run {
//                         id
//                         starts_at
//                         ends_at

//                         rooms {
//                             id
//                             name
//                         }

//                         event {
//                             id
//                             title
//                             length_seconds
//                             event_category {
//                                 name
//                                 team_member_name
//                             }
//                             team_members {
//                                 id
//                                 display_team_member
//                                 user_con_profile {
//                                     id
//                                     name_without_nickname
//                                     email
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }`;
//     const variables = {
//         userId,
//         conventionDomain: getConventionDomain()
//     };
//     const result = await request(this.accessToken, query, variables);
//     return result.convention.user_con_profile_by_user_id.signups;
// };

// TODO: Possibly delete, this seems unused
// Intercode.prototype.getEvent = async function(id){
//     const query = gql`query getEvent($conventionDomain: String!, $id: Int!) {
//         convention: conventionByDomain(domain: $conventionDomain) {
//             event(id: $id) {
//                 id
//                 title
//                 length_seconds
//                 event_category {
//                     name
//                     team_member_name
//                 }

//                 runs {
//                     id
//                     starts_at
//                     ends_at
//                     rooms {
//                         id
//                         name
//                     }
//                 }

//                 team_members {
//                     id
//                     display_team_member
//                     user_con_profile {
//                         id
//                         name_without_nickname
//                         email
//                     }
//                 }
//             }
//         }
//     }`;
//     const variables = {
//         conventionDomain: getConventionDomain(),
//         id: id,
//     };
//     const result = await request(this.accessToken, query, variables);
//     return result.convention.event;
// };

// TODO: Delete?  This seems unused
// Intercode.prototype.getConvention = function(cb){
//     const query = gql`query getConvention($conventionDomain: String!) {
//         convention: conventionByDomain(domain: $conventionDomain) {
//             id
//             name
//             starts_at
//             ends_at
//         }
//     }`;
//     request(this.accessToken, query, { conventionDomain: getConventionDomain() }, cb);
// };

module.exports = Intercode;
