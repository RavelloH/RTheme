import { useEvent } from '@/store/useEvent';
import message from '@/utils/message';

export default function Sideicon() {
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    const { emit } = useEvent();
    return (
        <ul>
            <li>
                <a
                    href='#'
                    id='icon-color'
                    onClick={() => {
                        message.add(
                            <a>
                                此功能尚在开发&nbsp;<span className='ri-alert-line'></span>
                            </a>,
                            1500,
                        );
                        return false;
                    }}
                    aria-label='color'>
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
                    aria-label='music'>
                    <span className='i ri-file-music-line'></span>
                </a>
            </li>
            <li>
                <a
                    href='#'
                    id='icon-fullscreen'
                    onClick={() => {
                        toggleFullScreen();
                        return false;
                    }}
                    aria-label='fullscreen'>
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
                    aria-label='share'>
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
                    aria-label='setting'>
                    <span className='i ri-settings-4-line'></span>
                </a>
            </li>
        </ul>
    );
}
