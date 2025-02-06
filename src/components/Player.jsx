/* eslint-disable @next/next/no-img-element */
'use client';

import switchElementContent from '@/utils/switchElement';
import { useEvent } from '@/store/useEvent';
import { useEffect, useState } from 'react';
import message from '@/utils/message';
import cookie from '@/assets/js/lib/cookie';
import config from '../../config';

export default function Player() {
    const { emit, on, off } = useEvent();
    const [playList, setPlayList] = useState([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(null);
    // 新增：记录悬停的专辑封面索引
    const [albumHoverIndex, setAlbumHoverIndex] = useState(null);

    // 高亮元素
    function highlightElement(selector) {
        const element = document.querySelector(selector);
        const originColor = element.style.color;
        element.style.transition = 'color 500ms';
        element.style.color = 'var(--theme-orange)';
        setTimeout(() => {
            element.style.color = originColor;
        }, 1500);
    }

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
    function musicChange(name, url) {
        if (music.paused == false) {
            musicPlay();
        }
        setTimeout(() => {
            music.src = url;
            music.load();
            switchElementContent('#music-name', name);
            // 新增：更新当前播放歌曲状态
            const index = playList.findIndex((item) => item.name === name);
            setCurrentSongIndex(index);
            setTimeout(() => {
                if (music.paused == true) {
                    musicPlay();
                }
                if (cookie.getItem('settingEnableMusicStateStorage') !== 'false') {
                    cookie.setItem('musicPlayingName', name);
                    cookie.setItem('musicPlayingSource', url);
                }
                message.switch(
                    <a onClick={() => emit('openInfobar', 'music')}>
                        <strong>正在播放: {name}</strong>&nbsp;
                        <span className='i ri-music-2-fill'></span>
                    </a>,
                );
                setTimeout(() => message.switch(message.original), 10000);
            }, 100);
        }, 200);
    }
    function loadPlayList() {
        // if (playList.length > 0) {
        //     musicChange(playList[0].name, playList[0].url);
        //     playList.shift();
        //     localStorage.setItem('playList', JSON.stringify(playList));
        // }
        console.log(playList);
    }

    // 新增：根据鼠标位置更新进度
    function handleProgressBarDrag(e) {
        const container = document.getElementById('music-progress-container');
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.min(1, Math.max(0, clickX / rect.width));
        const audio = document.getElementById('music');
        if (audio.duration) {
            audio.currentTime = percent * audio.duration;
            musicUpdata();
        }
    }
    // 新增：开始拖动进度条
    function handleProgressMouseDown(e) {
        handleProgressBarDrag(e);
        function handleMouseMove(e) {
            handleProgressBarDrag(e);
        }
        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function getRecommandMusic() {
        fetch(config.musicApi + 'playlist/track/all?limit=50&offset=0&id=' + config.playList)
            .then((response) => response.json())
            .then((data) => {
                let playLists = [];
                for (let i = 0; i < data['songs'].length; i++) {
                    playLists.push({
                        name: data['songs'][i]['name'],
                        url:
                            'http://music.163.com/song/media/outer/url?id=' +
                            data['songs'][i]['id'] +
                            '.mp3',
                        artist: data['songs'][i]['ar'][0]['name'],
                        pic: data['songs'][i]['al']['picUrl'],
                        album: data['songs'][i]['al']['name'],
                    });
                }
                localStorage.setItem('recommandMusic', JSON.stringify(playLists));
                setPlayList(
                    JSON.parse(localStorage.getItem('playList')) ||
                        JSON.parse(localStorage.getItem('recommandMusic')) ||
                        [],
                );
            });
    }

    function switchSong(index) {
        if (index === currentSongIndex) {
            return;
        }
        const musicItem = playList[index];
        musicChange(musicItem.name, musicItem.url);
        setCurrentSongIndex(index);
    }

    useEffect(() => {
        on('musicChange', musicChange);
        on('musicPlay', musicPlay);
        on('musicUpdata', musicUpdata);
        on('musicLoad', getRecommandMusic);
        setPlayList(JSON.parse(localStorage.getItem('playList')) || []);
        loadPlayList();
        return () => {
            off('musicChange', musicChange);
            off('musicPlay', musicPlay);
            off('musicUpdata', musicUpdata);
            off('musicLoad', getRecommandMusic);
        };
    }, []);

    // 新增：仅显示最多20首音乐，并计算间隙
    const itemsToShow = [];
    if (playList.length > 0) {
        for (let i = 0; i < 10; i++) {
            itemsToShow.push(playList[(currentSongIndex + i) % playList.length]);
        }
    }
    const gapCss =
        itemsToShow.length > 1 ? `calc((100% - 80px) / ${itemsToShow.length - 1})` : '0px';

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                }}>
                <div
                    id='playlist-albums'
                    style={{
                        position: 'relative',
                        width: '50%',
                        height: '80px',
                        margin: '0 10px 0 0',
                    }}>
                    {itemsToShow.map((musicItem, index) => (
                        <div
                            key={index}
                            onMouseEnter={() => setAlbumHoverIndex(index)}
                            onMouseLeave={() => setAlbumHoverIndex(null)}
                            onClick={() => switchSong(currentSongIndex + index)}
                            style={{
                                position: 'absolute',
                                left: index === 0 ? '0px' : `calc(${index} * ${gapCss})`,
                                zIndex: itemsToShow.length - index,
                                width: '80px',
                                height: '80px',
                                overflow: 'hidden',
                                borderRadius: '8px',
                                transition: 'transform 300ms ease',
                                transform:
                                    albumHoverIndex === index
                                        ? 'translateY(-15px)'
                                        : 'translateY(0)',
                            }}>
                            <img
                                src={musicItem.pic}
                                alt={musicItem.album}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    ))}
                </div>
                <div
                    id='playlist-title'
                    style={{
                        width: '50%',
                        height: '80px',
                        overflow: 'auto',
                    }}>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                        {playList.map((item, idx) => (
                            <li
                                key={idx}
                                onMouseEnter={() => setHoverIndex(idx)}
                                onMouseLeave={() => setHoverIndex(null)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    position: 'relative',
                                }}>
                                <div>
                                    {idx + 1}. {item.name}
                                    {hoverIndex === idx && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                cursor: 'pointer',
                                                padding: '0 5px',
                                                background:
                                                    'linear-gradient(to right, rgba(30,30,30,0) 0%, #1e1e1e 100%)',
                                            }}>
                                            &nbsp;&nbsp;&nbsp;&nbsp;
                                            <span className='ri-delete-bin-6-fill'></span>
                                            <span className='ri-play-fill'></span>
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
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
                    preload='none'></audio>
                <div id='music-bar'>
                    <div id='music-progress-container' onMouseDown={handleProgressMouseDown}>
                        <div id='music-progress'></div>
                    </div>
                </div>
                <div id='music-operation'>
                    <span>
                        <span
                            onClick={() => {
                                emit('closeInfobar');
                                setTimeout(() => {
                                    emit('openInfobar', 'music');
                                }, 500);
                            }}>
                            <span className='i ri-play-list-line'></span>
                        </span>
                    </span>

                    <span>
                        <span
                            className='i ri-skip-back-line'
                            onClick={() => {
                                nextMusic();
                            }}></span>
                    </span>
                    <span>
                        <span
                            id='music-button'
                            onClick={() => {
                                musicPlay();
                            }}>
                            <span className='i ri-play-line'></span>
                        </span>
                    </span>
                    <span>
                        <span
                            className='i ri-skip-forward-line'
                            onClick={() => {
                                prevMusic();
                            }}></span>
                    </span>
                    <span>
                        <span className='i ri-repeat-one-line'></span>
                    </span>
                </div>
            </div>
        </>
    );
}
