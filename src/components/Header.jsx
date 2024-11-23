/* eslint-disable @next/next/no-img-element */
import Nav from './Nav';
import config from '../../config';
import Image from 'next/image';

export default function Header() {
    return (
        <header>
            <div id='logo' className='loading' style={{ '--i': 1 }}>
                <a href='#userbar'>
                    <img
                        id='avatar'
                        className='no-zoom'
                        src='/avatar.jpg'
                        alt='avatar'
                        placeholder='blur'
                    />
                    {config.logo && (
                        <Image
                            id='avatarname'
                            className='no-zoom'
                            src={config.logo.src}
                            alt={config.logo.alt}
                            width={config.logo.width}
                            height={config.logo.height}
                        />
                    )}
                </a>
            </div>
            <div id='header-side'>
                <div id='navs'>
                    <Nav />
                </div>
                <div id='toggle' className='loading' style={{ '--i': 0 }}></div>
            </div>
        </header>
    );
}
