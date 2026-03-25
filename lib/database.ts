import pg, { PoolConfig } from 'pg';
import config from 'config';
import c from 'ansi-colors';

if (config.has('db.poolSize')){
    pg.defaults.poolSize = config.get('db.poolSize');
}

let dbURL: string = config.get('app.dbURL');
if(config.get('app.dbSSL')){
    dbURL +=  '?ssl=true';
}

const poolConfig: PoolConfig = { connectionString: dbURL };
if(config.get('app.dbSSL')){
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

if (config.get('app.dbPoolSize')){
    poolConfig.max = config.get('app.dbPoolSize');
}

export const pool = new pg.Pool(poolConfig);

pool.on('error', function (err) {
    console.error('idle client error', err.message, err.stack);
});

export async function query(q: string, values: unknown[] = []){
    const client = await pool.connect();
    try {
        const start = new Date();
        const result = await client.query(q, values);
        if (config.get('app.debug')){
            console.log(`${c.green(`[SQL ${new Date().getTime() - start.getTime()}ms]`)} ${q} ${values.length > 0 ? c.yellow(JSON.stringify(values)) : ''}`);
        }
        return result;
    } catch (error) {
        console.error(`${c.red('[SQL error]')} ${error} while running:\n  ${q} ${values.length > 0 ? c.yellow(JSON.stringify(values)) : ''}`);
        throw error;
    } finally {
        client.release();
    }
}

export async function querySingle<T = unknown>(q: string, values: unknown[] = []): Promise<T | undefined> {
    const result = await query(q, values);
    if (result.rows.length){
        return result.rows[0];
    }
    return undefined;
}

export async function queryRows<T = unknown>(q: string, values: unknown[] = []): Promise<T[]> {
    const result = await query(q, values);
    return result.rows;
}

export async function findMultipleById<T extends { id: number } = { id: number }>(q: string, ids: number[]): Promise<(T | undefined)[]> {
    const rows = await queryRows<T>(q, [ids]);
    return ids.map((id: number) => rows.find((row) => row.id === id));
}

export async function insertReturningId(q: string, values: unknown[] = []): Promise<number> {
    const result = await query(q, values);
    return result.rows[0].id;
}

export async function end() {
    await pool.end();
}
