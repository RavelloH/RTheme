import prisma from '@/app/api/_utils/prisma';

import config from '@/../config';
import { cookies } from 'next/headers';
import tokenServer from '@/app/api/_utils/token';

export const metadata = {
    title: '草稿 \\ Draft | ',
    description: '欢迎来到我的博客，这里可以找到我的文章和作品。',
};

function formatDate(dateStr) {
    var date = new Date(dateStr);
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function createCategory(arr) {
    const elements = arr.map((item, index) => (
        <a key={index} href={'/categories/' + item.name}>
            {item.name}
        </a>
    ));
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [<span key={index}>/</span>, element];
        }
        return element;
    });
    return <sapn className='class'>{joinedElements}</sapn>;
}

function createTag(arr) {
    const elements = arr.map((item, index) => (
        <a key={index} href={'/tags/' + item.name}>
            {'#' + item.name}
        </a>
    ));
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [element];
        }
        return element;
    });
    return <p className='class'>{joinedElements}</p>;
}

export default async function Draft() {
    const cookieStore = (await cookies()).get('usertoken');
    if (!cookieStore) {
        return (
            <div className='texts full overflow center'>
                <h3 className='center'>请先登录</h3>
            </div>
        );
    }

    let user;

    try {
        user = await tokenServer.verify(cookieStore.value);
    } catch (e) {
        console.error(e);
        return (
            <>
                <div className='texts full center'>
                    <h3 className='center'>用户凭据失效，请重新登录</h3>
                </div>
            </>
        );
    }

    const posts = await prisma.post.findMany({
        where: { published: false, userUid: user.uid },
        orderBy: { createdAt: 'desc' },
        include: {
            category: true,
            tag: true,
            ip: false,
            content: false,
        },
    });
    await prisma.$disconnect();

    let postList = [];

    posts.forEach((post, index) => {
        postList.push(
            <div className='loading listprogram' key={index} style={{ '--i': index + 1 }}>
                <article>
                    <span className='article-name'>
                        <h4>
                            <a href={'/manage/posts/draft/' + post.name}>{post.title}</a>
                        </h4>
                    </span>
                    <div className='articles-info'>
                        <span className='ri-time-line'></span>{' '}
                        <time>{formatDate(post.createdAt)}</time> {' • '}
                        <span className='ri-archive-line'></span>
                        {createCategory(post.category)}
                    </div>
                    {createTag(post.tag)}
                </article>
                <hr />
            </div>,
        );
    });

    return (
        <>
            <div className='texts half loading' id='showarea' style={{ '--i': 0 }}>
                <h3 id='articles-index-title'>
                    Draft / <wbr />
                    草稿
                </h3>
                <br />
                <span className='virgule' id='articles-info-1'>
                    管理你的{posts.length}篇草稿。
                </span>
            </div>
            <div className='listlines' id='resultarea'>
                {postList}
            </div>
        </>
    );
}
