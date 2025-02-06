import prisma from '@/app/api/_utils/prisma';
import config from '@/../config';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Comment from '@/components/Comment';
import PostSuggestion from '@/components/PostSuggeston';
import Link from 'next/link';
import Image from 'next/image';
import formatDateWithTimeZone from '@/utils/time';
import NotFound from '@/app/not-found';
import dynamic from 'next/dynamic';
import Shiki from '@shikijs/markdown-it';
import MarkdownIt from 'markdown-it';
import MenuLoader from '@/components/MenuLoader';
import ImageZoom from '@/components/ImageZoom';
import LinkPreview from '@/components/LinkPreview';
import CodeBlockTools from '@/components/CodeBlockTools';

const PageVisitors = dynamic(() => import('@/components/PageVisitors'), { ssr: false });

const md = MarkdownIt({ html: true });
md.use(
    await Shiki({
        themes: {
            light: 'dark-plus',
            dark: 'dark-plus',
        },
    }),
);

// 处理 h1 到 h6 标签
md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    const level = tokens[idx].tag.slice(1);
    const title = tokens[idx + 1].content;
    const slug = title.replace(/\s+/g, '-').toLowerCase();
    return `<h${level}><a href="#${slug}" id="${slug}" title="${title}" onclick="window.location.hash=this.getAttribute('href')">`;
};

md.renderer.rules.heading_close = function (tokens, idx) {
    const level = tokens[idx].tag.slice(1);
    return `</a></h${level}>`;
};

md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const src = tokens[idx].attrGet('src');
    const alt = tokens[idx].content;
    return `
        <div class="imgbox">
            <img src="${src}" alt="${alt}" loading="lazy" data-zoomable="true">
            <span>${alt}</span>
        </div>
    `;
};
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    let href = token.attrGet('href');
    if (href) {
        if (href.startsWith('#')) {
            token.attrSet('onclick', "window.location.hash=this.getAttribute('href')");
        } else if (href.startsWith('http')) {
            if (!config.siteUrl || !href.startsWith(config.siteUrl)) {
                token.attrSet('target', '_blank');
            }
        }
    }
    return self.renderToken(tokens, idx, options);
};

let title;

export async function generateStaticParams() {
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

    return posts.map((post) => ({
        slug: post.name,
    }));
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
            {item.name}
        </a>
    ));
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

export default async function Post(params) {
    const { slug } = params.params;
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
        return <NotFound />;
    }

    title = post.title;

    return (
        <article>
            <ImageZoom />
            <LinkPreview />
            <CodeBlockTools />
            <div id='articles-header'>
                <h1>
                    <a href={'/posts/' + post.name}>{post.title}</a>
                </h1>
                <h4>{post.name}</h4>
                <p className='articles-info'>
                    <span className='ri-time-line'></span>{' '}
                    <time>{formatDateWithTimeZone(post.createdAt, -8)}</time>
                    {'  •  '} <span className='ri-archive-line'></span>
                    {createCategory(post.category)} {' • '}
                    <span className='ri-t-box-line'></span>{' '}
                    <span id='textLength'>{post.content.length}字</span>
                    {' • '}
                    <span className='ri-search-eye-line'></span>{' '}
                    <PageVisitors url={'/posts/' + post.name} />
                </p>
                {createTag(post.tag)}
                <hr />
            </div>

            <div
                id='articles-body'
                style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                }}
            >
                <div dangerouslySetInnerHTML={{ __html: md.render(post.content) }} />
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
                <div id='blockchain-data' className='center'>
                    <br />
                    <span className='barcode one-line'>{post.id}</span>
                </div>
                <PostSuggestion name={post.name} />
                <br />
                <br />
                <Comment />
                <MenuLoader />
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
