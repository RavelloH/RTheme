import prisma from '@/app/api/_utils/prisma';
import config from '@/../config';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Comment from '@/components/Comment';
import PostSuggestion from '@/components/PostSuggeston';
import Link from 'next/link';
import formatDateWithTimeZone from '@/utils/time';
import { cookies } from 'next/headers';
import NotFound from '@/app/not-found';
import tokenServer from '@/app/api/_utils/token';
let title;

function createCategory(arr) {
    const elements = arr.map((item, index) => <a key={index}>{item.name}</a>);
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [<span key={index}>/</span>, element];
        }
        return element;
    });
    return <sapn className='class'>{joinedElements}</sapn>;
}

function createTag(arr) {
    const elements = arr.map((item, index) => <a key={index}>{item.name}</a>);
    const joinedElements = elements.map((element, index) => {
        if (index > 0) {
            return [element];
        }
        return element;
    });
    return (
        <p className='articles-tags'>
            <span className='ri-price-tag-3-line'></span>
            {joinedElements}
        </p>
    );
}

export default async function DraftContent(params) {
    const cookieStore = cookies().get('usertoken');
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
            <div className='texts full center'>
                <h3 className='center'>用户凭据失效，请重新登录</h3>
            </div>
        );
    }

    const { slug } = params.params;
    const post = await prisma.post.findFirst({
        where: {
            name: slug,
            published: false,
            userUid: user.uid,
        },
        include: {
            category: true,
            tag: true,
        },
    });
    await prisma.$disconnect();

    if (!post) {
        return <NotFound />;
    }

    title = post.title;

    return (
        <article>
            <div id='articles-header'>
                <h1>
                    <a href={'/manage/posts/draft/' + post.name}>草稿: {post.title}</a>
                </h1>
                <h4>{post.name}</h4>
                <p className='articles-info'>
                    <span className='ri-time-line'></span>{' '}
                    <time>{formatDateWithTimeZone(post.createdAt, -8)}</time>
                    {'  •  '} <span className='ri-archive-line'></span>
                    {createCategory(post.category)} {' • '}
                    <span className='ri-t-box-line'></span>{' '}
                    <span id='textLength'>{post.content.length}字</span>
                    {/* {' • '}<span className='ri-search-eye-line'></span> <span id='pageVisitors'>---</span> */}
                </p>
                {createTag(post.tag)}
                <hr />
            </div>

            <div id='articles-body'>
                <MDXRemote source={post.content} components={{ a: Link }} />
            </div>
            <div id='articles-footer'>
                <hr />
                <div className='articles-footer-cc'>
                    <span className='i_small ri-information-line'></span> 原创内容使用{' '}
                    <a
                        href='https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans'
                        target='_blank'
                        className='no-effect'
                    >
                        <span className='ri-creative-commons-line'></span>
                        <span className='ri-creative-commons-nc-line'></span>
                        <span className='ri-creative-commons-nd-line'></span>知识共享
                        署名-非商业性使用-相同方式共享 4.0 (CC BY-NC-ND 4.0)
                    </a>
                    协议授权。转载请注明出处。
                </div>
                {post.createdAt !== post.updatedAt ? (
                    <span>
                        <span className='ri-edit-box-line'></span> 最后编辑于{' '}
                        {formatDateWithTimeZone(post.updatedAt, -8)}
                    </span>
                ) : (
                    ''
                )}
                <div id='blockchain-data'></div>
                <br />
                <div className='info center'>
                    这是一个草稿。
                    <br />
                    除你以外，此文章对其他人不可见。
                    <br />
                    使用左侧用户栏以编辑文章，或更改此文章的状态。
                </div>
                <br />
                <br />
            </div>
        </article>
    );
}

export async function generateMetadata({ params }) {
    const { slug } = params;
    const post = await prisma.post.findFirst({
        where: {
            name: slug,
            published: true,
        },
        include: {
            category: true,
            tag: true,
        },
    });
    await prisma.$disconnect();
    if (!post) {
        return config.siteName;
    }
    return {
        title: post.title,
    };
}
