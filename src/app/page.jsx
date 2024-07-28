import config from '../../config';

export const metadata = {
    title: '主页 \\ Home | ' + config.siteName,
    description: '欢迎来到我的博客，这里可以找到我的文章和作品。',
};

export default function Home() {
    return (
        <div className='texts' id='main-text' style={{ '--i': 0 }}>
            <h2 className='loading' style={{ '--i': 4 }}>
                WELCOME{' '}
                <span className='loading' style={{ '--i': 6 }}>
                    TO
                </span>
            </h2>
            <h3 className='loading' style={{ '--i': 1 }}>
                RavelloH&apos;s 「BLOG」
            </h3>
            <span id='jumping' className='virgule loading' style={{ '--i': 3 }}>
                ## {config.siteHelloWords}
            </span>
            <div className='button-list loading' style={{ '--i': 5 }}>
                <a className='button loading' href='/posts/'>
                    文稿 / POST &gt;
                </a>{' '}
                <a className='button loading' href='/projects/'>
                    项目 / PROJECTS &gt;
                </a>
            </div>
        </div>
    );
}
