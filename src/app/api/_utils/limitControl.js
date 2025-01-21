import { headers } from 'next/headers';
import prisma from './prisma';

async function checkLimitControl(request) {
    const ip =
        request.headers.get("x-real-ip") ||
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-vercel-proxied-for') ||
        request.ip ||
        (request.connection && request.connection.remoteAddress) ||
        '';
    const currentTime = new Date();

    const count = await prisma.requestLog.count({
        where: {
            ip: ip,
            requestTime: {
                gte: new Date(currentTime.getTime() - 60000),
            },
        },
    });

    await prisma.$disconnect();
    return count <= 20;
}

async function updateLimitControl(request) {
    const ip =
        request.headers.get("x-real-ip") ||
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-vercel-proxied-for') ||
        request.ip ||
        (request.connection && request.connection.remoteAddress) ||
        '';
    console.log(ip);
    const currentTime = new Date();

    await prisma.requestLog.create({
        data: {
            ip: ip,
            requestTime: currentTime,
        },
    });

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    await prisma.requestLog.deleteMany({
        where: {
            requestTime: {
                lt: fiveMinutesAgo,
            },
        },
    });
}

const limitControl = {
    check: async function (req) {
        return await checkLimitControl(req);
    },
    update: async function (req) {
        return await updateLimitControl(req);
    },
};

export default limitControl;
