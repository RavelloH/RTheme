import Player from './Player';

export default function Infobar() {
    return (
        <>
            <div id='infobar-header'>
                <div id='infobar-title'>INFO</div>
                <div id='infobar-toggle'>
                    <span className='i ri-arrow-down-s-line'></span>
                </div>
            </div>
            <div id='infobar-context'>
                <div id='infobar-left'></div>
                <div id='infobar-right'>
                    <h2 id='time'>00:00</h2>
                    <hr />
                    <Player />
                    <div id='state-bar'></div>
                    <div id='uid' className='barcode center'>
                        <br />
                    </div>
                </div>
            </div>
        </>
    );
}
