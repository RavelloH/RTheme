import global from '../assets/js/Global';
import { useEvent } from '@/store/useEvent';

export default function Sideicon() {
    const { emit } = useEvent();
    return (
        <ul>
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
                        emit('openInfobar', 'music');
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
                        emit('openInfobar', 'share');
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
                        emit('openInfobar', 'setting');
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
