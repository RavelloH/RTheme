import global from '../assets/js/Global';

export default function Sideicon() {
    return (
        <ul>
            <li>
                <a
                    href='#swap'
                    id='icon-swap'
                    onClick={() => {
                        global.openInfoBar('swap');
                        return false;
                    }}
                    aria-label='swap'
                >
                    <span className='i ri-swap-box-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#'
                    id='icon-color'
                    onClick={() => {
                        global.toggleThemeMode();
                        return false;
                    }}
                    aria-label='color'
                >
                    <span className='i ri-sun-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#music'
                    id='icon-music'
                    onClick={() => {
                        global.openInfoBar('music');
                        return false;
                    }}
                    aria-label='music'
                >
                    <span className='i ri-file-music-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#'
                    id='icon-fullscreen'
                    onClick={() => {
                        global.toggleFullScreen();
                        return false;
                    }}
                    aria-label='fullscreen'
                >
                    <span className='i ri-aspect-ratio-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#share'
                    id='icon-share'
                    onClick={() => {
                        global.openInfoBar('share');
                        return false;
                    }}
                    aria-label='share'
                >
                    <span className='i ri-share-box-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#setting'
                    id='icon-setting'
                    onClick={() => {
                        global.openInfoBar('setting');
                        return false;
                    }}
                    aria-label='setting'
                >
                    <span className='i ri-settings-4-line'></span>
                </a>
            </li>
        </ul>
    );
}
