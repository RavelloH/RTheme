import FooterIcon from './FooterIcon';
import config from '../../config';

export default function Footer() {
    return (
        <footer>
            <div id='icons-left'>
                <nav>
                    <FooterIcon />
                </nav>
            </div>
            <div
                id='icons-right'
                className='loading loaded'
                style={{ '--i': 1 }}
                data-umami-event='footer-消息栏'
            >
                <div id='message-bar'>
                    <noscript>
                        <a className='red' href={config.remotePath + '/about/help#javascript'}>
                            <strong>错误:无法使用JAVASCRIPT</strong>&nbsp;
                            <span className='i ri-alert-line'></span>
                        </a>
                    </noscript>
                </div>
            </div>
        </footer>
    );
}
