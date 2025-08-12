import prisma from '@/app/api/_utils/prisma';

import getTime from '@/utils/getTime';
import Search from '@/components/Search';
import Virgule from '@/components/Virgule';
import DynamicVirgule from '@/components/DynamicVirgule';

export const metadata = {
    title: '文稿 \\ Posts',
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
        <a key={2 * index} href={'/categories/' + item.name}>
            {item.name}
        </a>
    ));
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [<span key={2 * index + 1}>/</span>, element];
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

export default async function Posts() {
    const posts = await prisma.post.findMany({
        where: { published: true },
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
                            <a href={'/posts/' + post.name}>{post.title}</a>
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

    const latestCreatedAt =
        posts.length > 0
            ? posts[0].createdAt.toISOString
                ? posts[0].createdAt.toISOString()
                : posts[0].createdAt
            : null;
    return (
        <>
            <div className='texts half loading' id='showarea' style={{ '--i': 0 }}>
                <h3 id='articles-index-title'>
                    POSTS / <wbr />
                    文稿
                </h3>
                <br />
                <Search
                    title='#articles-index-title'
                    remoteOutput='#articles-info-1'
                    localOutput='#index-info'
                    result='#resultarea'
                />
                <span className='virgule' id='articles-info-1'>
                    记录 & 索引所有文章。
                </span>
                <span className='virgule' id='index-info'>
                    <DynamicVirgule count={posts.length} latestCreatedAt={latestCreatedAt} />
                </span>
            </div>
            <div className='listlines' id='resultarea'>
                {postList}
            </div>
        </>
    );
}
