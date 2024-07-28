import config from '../../config';

const check = `
if (window && performance.navigation.type == 0 && document.referrer.startsWith(window.location.origin)) {
    document.body.setAttribute("quickload",true)
} else {
 document.querySelector("#load-shade").classList.toggle('active')
}
`;

export default function LoadingShade() {
    return (
        <>
            <div id='shade-global'></div>
            <div id='load-shade' className=''>
                <script dangerouslySetInnerHTML={{ __html: check }} />
                <div id='load-content'>
                    <hr />
                    <h2>{config.siteName}</h2>
                    <h3>
                        LOAD
                        <span id='loading-text'>
                            ing
                            <span className='breath'>
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </span>
                        </span>
                    </h3>
                    <hr /> <br />
                </div>
            </div>
        </>
    );
}
