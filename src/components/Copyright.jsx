import config from '../../config';

export default function Copyright() {
    return (
        <>
            <b>
                Theme : <a href='https://github.com/ravelloh/RTheme'>RTheme</a>. <br />
                Copyright © {config.copyrightStartTime} - <b id='year'></b> {config.author}. <br />
                All rights reserved.
            </b>
        </>
    );
}
