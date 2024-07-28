import prisma from '@/app/api/_utils/prisma';

const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    include: {
        category: false,
        tag: false,
        ip: false,
        content: false,
    },
});
await prisma.$disconnect();

let previousArticlesUrl, nextArticlesUrl, previousArticlesTitle, nextArticlesTitle;

export default function PostSuggestion(parmas) {
    for (let i = 0; i < posts.length; i++) {
        if (posts[i].name == parmas.name) {
            if (i == 0) {
                previousArticlesUrl = null;
                nextArticlesUrl = posts[i + 1].name;
                previousArticlesTitle = null;
                nextArticlesTitle = posts[i + 1].title;
            } else if (i == posts.length - 1) {
                previousArticlesUrl = posts[i - 1].name;
                nextArticlesUrl = null;
                previousArticlesTitle = posts[i - 1].title;
                nextArticlesTitle = null;
            } else {
                previousArticlesUrl = posts[i - 1].name;
                nextArticlesUrl = posts[i + 1].name;
                previousArticlesTitle = posts[i - 1].title;
                nextArticlesTitle = posts[i + 1].title;
            }
        }
    }

    return (
        <>
            <div id='more-articles'>
                {previousArticlesUrl ? (
                    <a id='previous' href={previousArticlesUrl} className='no-effect'>
                        <b>
                            <span className='ri:arrow-left-s-line'></span> 上一篇
                        </b>
                        <br />
                        <span className='one-line'>{previousArticlesTitle}</span>
                    </a>
                ) : (
                    <a id='previous' style={{ cursor: 'default' }} className='no-effect'>
                        <b>
                            <span className='ri:arrow-left-s-line'></span> 上一篇
                        </b>
                        <br />
                        <span className='one-line'>没有了</span>
                    </a>
                )}

                {nextArticlesUrl ? (
                    <a id='next' href={'/posts/' + nextArticlesUrl} className='no-effect'>
                        <b>
                            下一篇 <span className='ri:arrow-right-s-line'></span>
                        </b>

                        <br />
                        <span className='one-line'>{nextArticlesTitle}</span>
                    </a>
                ) : (
                    <a id='next' style={{ cursor: 'default' }} className='no-effect'>
                        <b>
                            下一篇 <span className='ri:arrow-right-s-line'></span>
                        </b>
                        <br />
                        <span className='one-line'>没有了</span>
                    </a>
                )}
            </div>
        </>
    );
}
