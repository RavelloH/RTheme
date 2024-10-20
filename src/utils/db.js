import prisma from '../app/api/_utils/prisma';

if (!global.cache) {
    global.cache = {};
}
const cache = global.cache;

async function getDB(table) {
    // console.log(`Checking cache for ${table}`);
    if (cache[table]) {
        // console.log(`Returning cached data for ${table}`);
        return cache[table];
    }
    // console.log(`Fetching ${table} from database`);
    const model = prisma[table];
    const data = await model.findMany({});

    cache[table] = data;
    return data;
}

export default getDB;