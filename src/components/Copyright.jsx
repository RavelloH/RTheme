import config from '../../config';

export default function Copyright() {
    return (
        <>
            <b>
                Theme : <a href='https://github.com/ravelloh/RTheme'>RTheme</a>. <br />
                Copyright © {config.copyrightStartTime} - {new Date().getFullYear()}{' '}
                <a href={config.siteURL} className=''>
                    {config.author}
                </a>
                . <br />
                All rights reserved.
            </b>
        </>
    );
}
