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
                    <a>
                        <div className='circle-loader'></div>
                    </a>
                </div>
            </div>
        </footer>
    );
}
