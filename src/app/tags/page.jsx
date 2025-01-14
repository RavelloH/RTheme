import config from '@/../config';
import prisma from '@/app/api/_utils/prisma';

export const metadata = {
    title: '标签 \\ Tags',
};

const postslength = await prisma.post.count(
    { where: { published: true } },
);

const tags = await prisma.tag.findMany({
    select: { name: true, post: true },
    where: { post: { some: { published: true } } },
});

let tagsList = [];

tags.forEach((tag, index) =>
    tagsList.push(
        <a className='class' href={'/tags/' + tag.name} key={index}>
            #{tag.name}({tag.post.length})
        </a>,
    ),
);

export default async function Tags() {
    return (
        <>
            <div className='texts full overflow center'>
                <h2 className='center'>Tags / 标签</h2>{' '}
                <span className='virgule center'>
                    {' '}
                    {'目前共有' + postslength + '篇文章,共' + tags.length + '个标签。'}{' '}
                </span>{' '}
                <br />
                <br />
                <div className='full center textarea' style={{ margin: '0 auto' }}>
                    {tagsList}
                </div>
            </div>
        </>
    );
}
