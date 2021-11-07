const pg = require('pg');
const parseDbUrl = require('parse-database-url');
const _ = require('underscore');
const async = require('async');

const intercodeDatabaseUrl = process.argv[2];
const furnitureDatabaseUrl = process.argv[3];

if (!intercodeDatabaseUrl || !furnitureDatabaseUrl) {
    console.error(`Usage: ${process.argv[1]} INTERCODE_DATABASE_URL FURNITURE_DATABASE_URL`);
    return;
}

const intercodePool = new pg.Pool(parseDbUrl(intercodeDatabaseUrl));
const furniturePool = new pg.Pool(parseDbUrl(furnitureDatabaseUrl));

async function mergeUserIdColumn(tableName, columnName, userIdsToMerge) {
    await async.each(userIdsToMerge, async ([mergeFrom, mergeTo]) => await furniturePool.query(
        `update ${tableName} set ${columnName} = $1 where ${columnName} = $2`,
        [mergeTo, mergeFrom]
    ));
}

async function remapUsers() {
    const userConProfileIdToFurnitureUserId = new Map(
        (await furniturePool.query('select id, intercode_id from users'))
            .rows.map((row) => [row.intercode_id, row.id])
    );
    const userConProfileRows = (
        await intercodePool.query(
            'select id, user_id from user_con_profiles where id = ANY($1::int[])',
            [[...userConProfileIdToFurnitureUserId.keys()]]
        )
    ).rows;
    const userConProfileIdToUserId = userConProfileRows.map(({ id, user_id }) => [id, user_id]);
    const userIdToUserConProfileIds = new Map(
        Object.entries(_.groupBy(userConProfileRows, (row) => row.user_id))
            .map(([userIdString, rows]) => {
                const userId = Number(userIdString);
                const userConProfileIds = rows.map((row) => row.id);
                userConProfileIds.sort((a, b) => a - b);

                return [userId, userConProfileIds];
            })
    );

    // for any users with multiple profiles, pick the winning profile
    const userIdsToMerge = [];
    userIdToUserConProfileIds.forEach((profileIds) => {
        if (profileIds.length > 1) {
            const mergeTargetId = userConProfileIdToFurnitureUserId.get(profileIds[0]);
            profileIds.slice(1).forEach((profileIdToMerge) => {
                userIdsToMerge.push([
                    userConProfileIdToFurnitureUserId.get(profileIdToMerge),
                    mergeTargetId
                ]);
            });
        }
    });

    console.log('Merging references to users with multiple profiles');
    await async.parallel([
        async () => await mergeUserIdColumn('runs', 'created_by', userIdsToMerge),
        async () => await mergeUserIdColumn('requests', 'created_by', userIdsToMerge),
        async () => await mergeUserIdColumn('requests', 'updated_by', userIdsToMerge),
    ]);

    console.log('Deleting users with merged profiles');
    await furniturePool.query('delete from users where id = ANY($1::int[])', [userIdsToMerge.map(([mergeFrom]) => mergeFrom)]);

    console.log('Updating user con profile IDs to user IDs');
    await async.each(userConProfileIdToUserId, async ([userConProfileId, userId]) => await furniturePool.query(
        'update users set intercode_id = $1 where intercode_id = $2',
        [userId, userConProfileId]
    ));
}

remapUsers().catch((err) => {
    console.error(err);
}).finally(() => {
    intercodePool.end();
    furniturePool.end();
});
