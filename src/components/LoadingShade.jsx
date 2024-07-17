import config from '../../config';

export default function LoadingShade() {
    return (
        <>
            <div id='shade-global'></div>
            <div id='load-shade' className='active'>
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
