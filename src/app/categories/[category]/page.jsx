import prisma from '@/app/api/_utils/prisma';

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

export default async function Posts({ params }) {
    const category = decodeURIComponent(params.category);
    const posts = await prisma.post.findMany({
        where: {
            published: true,
            category: {
                some: { name: category },
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
                    分类 : <wbr />
                    {category}
                </h3>
                <br />
                <span className='virgule' id='index-info'>
                    此分类下共有 {posts.length} 篇文章。
                </span>
            </div>
            <div className='listlines' id='resultarea'>
                {postList}
            </div>
        </>
    );
}

export async function generateMetadata({ params }) {
    const { category } = params;
    const categoryItem = await prisma.category.findFirst({
        where: {
            name: decodeURIComponent(category),
        },
    });
    await prisma.$disconnect();
    return {
        title: '分类:' + categoryItem.name,
    };
}

export async function generateStaticParams() {
    const categories = await prisma.category.findMany();
    await prisma.$disconnect();

    return categories.map((category) => ({
        category: category.name,
    }));
}
