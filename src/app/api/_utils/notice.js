import prisma from "./prisma";

async function sendNotice(content, href, userUid, createdAt = new Date()) {
    console.log('sendNotice:', content, href, userUid, createdAt);
    return prisma.notice.create({
        data: {
            content,
            href,
            userUid,
            createdAt,
        },
    });
}

export default sendNotice;
