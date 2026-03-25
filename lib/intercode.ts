import config from 'config';
import { ClientError, GraphQLClient } from 'graphql-request';
import _ from 'underscore';
import { URL } from 'url';
import c from 'ansi-colors';
import { ExecutableDefinitionNode, parse } from 'graphql/language';

// Stolen from the 3.x series of graphql-request.  This is a no-op tagged template function that
// exists just so that graphql-eslint can find the GraphQL template strings in this file for
// linting.
function gql(chunks: TemplateStringsArray, ...variables: unknown[]) {
    return chunks.reduce(
        (accumulator, chunk, index) => `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
        ''
    );
}

export class InvalidTokenError {
}

async function graphQLRequest(client: GraphQLClient, query: string, variables: unknown = undefined){
    try {
        const parsedQuery = parse(query);
        const queryName = (parsedQuery.definitions[0] as ExecutableDefinitionNode).name?.value;
        const start = new Date();
        const result = await client.request(query, variables);
        if (config.get('app.debug')){
            console.log(`${c.green(`[GraphQL ${new Date().getTime() - start.getTime()}ms]`)} ${queryName} ${variables ? c.yellow(JSON.stringify(variables)) : ''}`);
        }
        return result;
    } catch (err) {
        if((err as ClientError).response?.status === 401){
            throw new InvalidTokenError();
        }
        throw err;
    }
}

function getClient(token: string) {
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

export default class Intercode {
    accessToken: string;
    refreshToken?: string;
    client: GraphQLClient;

    constructor(accessToken: string, refreshToken?: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.client = getClient(this.accessToken);
    }

    request(query: string, variables: unknown = undefined) {
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

    async getPermissions(userId: string) {

        const query = gql`query getPermissions($conventionDomain: String!, $userId: ID!) {
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

    async getMemberEvents(userId: string) {
        const query = gql`query getMemberEvents($userId: ID!, $conventionDomain: String!) {
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

    async getRun(eventId: string, runId: string) {
        const query = gql`query getRun($conventionDomain: String!, $eventId: ID!, $runId: ID!) {
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
        try {
            const result = await this.request(query, variables);
            return result.convention.event.run;
        } catch (err) {
            if ((err as Error).toString().match(/Event not found/)) {
                return undefined;
            }
        }
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

    async getConvention(){


        const query = gql`query getConvention($conventionDomain: String!) {
            convention: conventionByDomain(domain: $conventionDomain) {
                id
                name
                starts_at
                ends_at
            }
        }`;
        const result = await this.request(query, { conventionDomain: getConventionDomain() });
        return result.convention;
    }
}
