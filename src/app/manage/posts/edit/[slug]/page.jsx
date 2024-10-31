import { cookies } from 'next/headers';
import tokenServer from '@/app/api/_utils/token';
import prisma from '@/app/api/_utils/prisma';
import NotFound from '@/app/not-found';
import Editor from '@/components/Editor';

export default async function EditPostPage(params) {
    const { slug } = (await params.params);
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
        console.log(e);
        return (
            <div className='texts full center'>
                <h3 className='center'>用户凭据失效，请重新登录</h3>
            </div>
        );
    }

    const post = await prisma.post.findUnique({
        where: { name: slug, userUid: user.uid },
        include: { category: true, tag: true },
    });
    await prisma.$disconnect();

    if (!post) {
        return <NotFound />;
    }

    return (
        <>
            <Editor
                name={post.name}
                title={post.title}
                category={post.category.map((t) => t.name).join(' ')}
                tag={post.tag.map((t) => t.name).join(" ")}
                content={post.content}
            />
        </>
    );
}
