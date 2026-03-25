import * as database from '../lib/database';
import validator from 'validator';

export async function get(id: number) {
    return await database.querySingle<User>('select * from users where id = $1', [id]);
}

export async function getByEmail(text: string) {
    return await database.querySingle<User>(
        'select * from users where email = $1',
        [text],
    );
}

export async function getByIntercodeId(text: string) {
    return await database.querySingle<User>('select * from users where intercode_id = $1', [text]);
}

export async function list() {
    return await database.queryRows('select * from users order by name');
}

export type User = {
    id: number,
    name: string,
    email: string,
    intercode_id: string
};

export async function create(data: Omit<User, 'id'>) {
    if (! validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'insert into users (name, email, intercode_id) values ($1, $2, $3) returning id';
    const dataArr = [data.name, data.email, data.intercode_id];
    return await database.insertReturningId(query, dataArr);
}

export async function update(id: number, data: Omit<User, 'id'>){
    if (! validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update users set name = $2, email = $3, intercode_id = $4 where id = $1';
    const dataArr = [id, data.name, data.email, data.intercode_id];
    await database.query(query, dataArr);
}

export async function remove(id: number){
    await database.query('delete from users where id = $1', [id]);
}

export async function findOrCreate(data: Omit<User, 'id'>) {
    const user = await getByIntercodeId(data.intercode_id);
    if (user) {
        await update(user.id, data);
        return await get(user.id);
    } else {
        const id = await create(data);
        return await get(id);
    }
}

function validate(data: Pick<User, 'name' | 'email'>){
    if (! validator.isLength(data.name, 2, 255)){
        return false;
    }
    if (! validator.isLength(data.email, 3, 100)){
        return false;
    }
    return true;
}
