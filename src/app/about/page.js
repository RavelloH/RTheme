import config from '@/../config';
import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import RunningTime from '@/components/RunnningTime';

// import doc from "../../../origin/about/about.mdx"

export const metadata = {
    title: '关于 \\ About',
};

const components = { RunningTime };

export default async function About() {
    const content = await fs.readFileSync('origin/about/about.mdx', 'utf-8');
    return (
        <>
            <div className='texts full overflow center'>
                <h2 className='center'>ABOUT / 关于</h2>{' '}
                <span className='virgule center'> {config.sign} </span> <br />
                <div className='full center textarea' style={{ margin: '0 auto' }}>
                    <MDXRemote source={content} components={components} />
                </div>
            </div>
        </>
    );
}
