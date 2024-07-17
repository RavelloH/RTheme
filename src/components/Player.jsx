'use client';

import global from '../assets/js/Global';

export default function Player() {
    return (
        <div id='music-player'>
            <div id='music-top'>
                <div id='music-name'>无正在播放的音乐</div>
                <div id='music-time'>00:00/00:00</div>
            </div>
            <audio
                id='music'
                src='/'
                onTimeUpdate={() => {
                    global.musicUpdata();
                }}
                loop='loop'
                preload='none'
            ></audio>
            <div id='music-bar'>
                <div id='music-progress-container'>
                    <div id='music-progress'></div>
                </div>
            </div>
            <div id='music-operation'>
                <span
                    onClick={() => {
                        global.musicSetting();
                    }}
                >
                    <span className='i ri-play-list-line'></span>
                </span>
                <span
                    className='i ri-skip-back-line'
                    onClick={() => {
                        global.musicGo(-10);
                    }}
                ></span>
                <span
                    id='music-button'
                    onClick={() => {
                        global.musicPlay();
                    }}
                >
                    <span className='i ri-play-line'></span>
                </span>
                <span
                    className='i ri-skip-forward-line'
                    onClick={() => {
                        global.musicGo(10);
                    }}
                ></span>
                <span className='i ri-repeat-one-line'></span>
            </div>
        </div>
    );
}
