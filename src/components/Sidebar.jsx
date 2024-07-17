'use client';

import config from '../../config';
import Menu from './Menu';
import Copyright from './Copyright';
import Sideicon from './Sideicon';

export default function Sidebar() {
    return (
        <>
            <div id='sidebar-top'>
                <div id='sideinfo'>
                    <h3>{config.author}&apos;s</h3>
                    <h2>BLOG</h2>
                    <a className='icons' href={'mailto:' + config.mail} id='email'>
                        {' '}
                        <span className='i ri-mail-add-fill'></span> &nbsp;{' '}
                        <span>{config.mail}</span>{' '}
                    </a>
                    <hr />
                </div>
            </div>
            <div id='sidebar-mid'>
                <menu id='sidebar-menu'>
                    <ul>
                        <Menu />
                    </ul>
                </menu>
            </div>
            <div id='sidebar-bottom'>
                <hr />
                <div id='side-info'>
                    <Copyright />
                </div>
                <div className='flex-iconset'>
                    <Sideicon />
                </div>
            </div>
        </>
    );
}
