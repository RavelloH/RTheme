import prisma from '@/app/api/_utils/prisma';

export const metadata = {
    title: '分类 \\ Categories',
};

const postslength = await prisma.post.count({ where: { published: true } });

const categories = await prisma.category.findMany({
    select: { name: true, post: true },
    where: { post: { some: { published: true } } },
});
await prisma.$disconnect();

let categoriesList = [];

categories.forEach((category, index) =>
    categoriesList.push(
        <a className='class' href={'/categories/' + category.name} key={index}>
            {category.name}({category.post.length})
        </a>,
    ),
);

export default async function Categories() {
    return (
        <>
            <div className='texts full overflow center'>
                <h2 className='center'>Categories / 分类</h2>{' '}
                <span className='virgule center'>
                    {' '}
                    {'目前共有' + postslength + '篇文章,共' + categories.length + '个分类。'}{' '}
                </span>{' '}
                <br />
                <br />
                <div className='full center textarea' style={{ margin: '0 auto' }}>
                    {categoriesList}
                </div>
            </div>
        </>
    );
}
