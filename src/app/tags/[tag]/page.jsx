import prisma from '@/app/api/_utils/prisma';

import config from '@/../config';

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

export default async function Posts(props) {
    const params = await props.params;
    const tag = decodeURIComponent(params.tag);
    const posts = await prisma.post.findMany({
        where: {
            published: true,
            tag: {
                some: { name: tag },
            },
        },
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

    return (
        <>
            <div className='texts half loading' style={{ '--i': 0 }}>
                <h3>
                    标签 : <wbr />
                    {tag}
                </h3>
                <br />
                <span className='virgule' id='index-info'>
                    此标签下共有 {posts.length} 篇文章。
                </span>
            </div>
            <div className='listlines' id='resultarea'>
                {postList}
            </div>
        </>
    );
}

export async function generateMetadata(props) {
    const params = await props.params;
    const { tag } = params;
    const categoryItem = await prisma.tag.findFirst({
        where: {
            name: decodeURIComponent(tag),
        },
    });
    await prisma.$disconnect();
    return {
        title: '标签:' + categoryItem.name + ' | ' + config.siteName,
    };
}

export async function generateStaticParams() {
    const tags = await prisma.tag.findMany();
    await prisma.$disconnect();

    return tags.map((tag) => ({
        tag: tag.name,
    }));
}
