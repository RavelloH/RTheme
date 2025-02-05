'use client';

import switchElementContent from '@/utils/switchElement';
import { useEvent } from '@/store/useEvent';
import { useEffect } from 'react';
import message from '@/utils/message';
import cookie from '@/assets/js/lib/cookie';

export default function Player() {
    const { emit, on, off } = useEvent();
    function timeTrans(times) {
        var t = '00:00';
        if (times > -1) {
            var hour = Math.floor(times / 3600);
            var min = Math.floor(times / 60) % 60;
            var sec = times % 60;
            t = '';
            if (min < 10) {
                t += '0';
            }
            t += min + ':';
            if (sec < 10) {
                t += '0';
            }
            t += sec.toFixed(2);
            t = t.substring(0, t.length - 3);
        }
        return t;
    }
    function musicUpdata() {
        const changeMusicProgress = (progress) => {
            document.querySelector('#music-progress').style.width = `${progress}%`;
        };
        changeMusicProgress((music.currentTime / music.duration) * 100);
        document.getElementById('music-time').innerHTML =
            timeTrans(music.currentTime) + '/' + timeTrans(music.duration);
    }
    function musicPlay() {
        if (music.src == window.location.origin + '/') {
            highlightElement('#music-name');
        } else {
            if (document.querySelector('#music-button').getAttribute('play') !== 'true') {
                document.querySelector('#music-button').setAttribute('play', 'true');
                switchElementContent(
                    '#music-button',
                    <span className='i ri-pause-line'></span>,
                    200,
                );
                music.play();
            } else {
                document.querySelector('#music-button').setAttribute('play', 'false');
                switchElementContent(
                    '#music-button',
                    <span className='i ri-play-line'></span>,
                    200,
                );
                music.pause();
            }
        }
    }
    function musicGo(second) {
        if (music.currentTime + second <= music.duration && music.currentTime + second >= 0) {
            music.currentTime = music.currentTime + second;
        }
    }
    function musicChange(name, url) {
        if (music.paused == false) {
            musicPlay();
        }
        setTimeout(() => {
            music.src = url;
            music.load();
            switchElementContent('#music-name', name);
            setTimeout(() => {
                if (music.paused == true) {
                    musicPlay();
                }
                if (cookie.getItem('settingEnableMusicStateStorage') !== 'false') {
                    cookie.setItem('musicPlayingName', name);
                    cookie.setItem('musicPlayingSource', url);
                }
                message.switch(
                    <a onClick={() => global.openInfoBar('music')}>
                        <strong>正在播放: {name}</strong>&nbsp;
                        <span className='i ri-music-2-fill'></span>
                    </a>,
                );
                setTimeout(() => message.switch(message.original), 10000);
            }, 100);
        }, 200);
    }

    useEffect(() => {
        on('musicChange', musicChange);
        on('musicPlay', musicPlay);
        on('musicGo', musicGo);
        on('musicUpdata', musicUpdata);
        return () => {
            off('musicChange', musicChange);
            off('musicPlay', musicPlay);
            off('musicGo', musicGo);
            off('musicUpdata', musicUpdata);
        };
    }, []);

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
                    musicUpdata();
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
                        emit('closeInfobar');
                        setTimeout(() => {
                            emit('openInfobar', 'music');
                        }, 500);
                    }}
                >
                    <span className='i ri-play-list-line'></span>
                </span>
                <span
                    className='i ri-skip-back-line'
                    onClick={() => {
                        musicGo(-10);
                    }}
                ></span>
                <span
                    id='music-button'
                    onClick={() => {
                        musicPlay();
                    }}
                >
                    <span className='i ri-play-line'></span>
                </span>
                <span
                    className='i ri-skip-forward-line'
                    onClick={() => {
                        musicGo(10);
                    }}
                ></span>
                <span className='i ri-repeat-one-line'></span>
            </div>
        </div>
    );
}
