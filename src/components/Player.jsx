/* eslint-disable @next/next/no-img-element */
'use client';

import switchElementContent from '@/utils/switchElement';
import { useEvent } from '@/store/useEvent';
import { useEffect, useState, useRef } from 'react';
import message from '@/utils/message';
import cookie from '@/assets/js/lib/cookie';
import config from '../../config';
import Virgule from './Virgule';

export default function Player() {
    const { emit, on, off } = useEvent();
    const playlistRef = useRef(null);
    const [playList, setPlayList] = useState([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [albumHoverIndex, setAlbumHoverIndex] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationTarget, setAnimationTarget] = useState(null);
    const [preloadedImages, setPreloadedImages] = useState({});
    const [isLoop, setIsLoop] = useState(false);
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
    const autoScrollTimerRef = useRef(null);

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
    const scrollToPlayingSong = () => {
        if (!playlistRef.current) return;

        const container = playlistRef.current;
        const playingItem = container.querySelector(`li:nth-child(${currentSongIndex + 1})`);

        if (playingItem) {
            const containerRect = container.getBoundingClientRect();
            const itemRect = playingItem.getBoundingClientRect();

            const relativeTop = itemRect.top - containerRect.top;
            const currentScroll = container.scrollTop;

            const targetScroll = currentScroll + relativeTop;

            container.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth',
            });
        }
    };
    function musicChange(name, url) {
        if (music.paused == false) {
            musicPlay();
        }
        setTimeout(() => {
            music.load();
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

    // 添加滚动到底部的辅助函数
    const scrollToBottom = () => {
        if (!playlistRef.current) return;
        const container = playlistRef.current;
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
        });
    };

    function addToPlayList(name, url, artist, pic, album) {
        const newPlayList = [
            ...JSON.parse(localStorage.getItem('playList')),
            { name, url, artist, pic, album },
        ];
        newPlayList.forEach((item) => {
            if (newPlayList.filter((i) => i.name === item.name).length > 1) {
                newPlayList.splice(newPlayList.indexOf(item), 1);
            }
        });
        setPlayList(newPlayList);
        localStorage.setItem('playList', JSON.stringify(newPlayList));

        // 添加setTimeout确保在DOM更新后滚动
        setTimeout(scrollToBottom, 100);
    }

    async function playToList(name, url, artist, pic, album) {
        // 先获取当前播放列表
        const currentList = JSON.parse(localStorage.getItem('playList')) || [];

        // 创建新的歌曲对象
        const newSong = { name, url, artist, pic, album };

        // 检查是否已存在
        const existingIndex = currentList.findIndex((item) => item.name === name);

        let newList;
        let targetIndex;

        if (existingIndex !== -1) {
            // 如果歌曲已存在，直接切换到该歌曲
            targetIndex = existingIndex;
            newList = currentList;
        } else {
            // 如果歌曲不存在，添加到列表末尾
            newList = [...currentList, newSong];
            targetIndex = newList.length - 1;
        }

        // 先更新localStorage
        localStorage.setItem('playList', JSON.stringify(newList));

        // 更新状态并等待完成
        await new Promise((resolve) => {
            setPlayList(newList);
            // 使用setTimeout确保状态已更新
            setTimeout(resolve, 0);
        });

        // 切换到新歌曲
        await switchSong(targetIndex);
    }

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
        const lastFetchTime = localStorage.getItem('lastMusicFetchTime');
        const currentTime = Date.now();
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (lastFetchTime && currentTime - parseInt(lastFetchTime) < CACHE_DURATION) {
            const cachedMusic = localStorage.getItem('recommandMusic');
            if (cachedMusic) {
                const playlistData = JSON.parse(localStorage.getItem('playList')) || JSON.parse(cachedMusic) || [];
                setPlayList(playlistData);
                // 确保设置完播放列表后更新歌曲名
                if (playlistData.length > 0) {
                    const initialIndex = Number(localStorage.getItem('playListIndex')) || 0;
                    setCurrentSongIndex(initialIndex);
                    // 直接更新歌曲名显示
                    switchElementContent(
                        '#music-name',
                        <Virgule text={playlistData[initialIndex].name} />,
                        0
                    );
                }
                return;
            }
        }

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
                if (playList.length === 0) {
                    localStorage.setItem('playList', JSON.stringify(playLists));
                }
                localStorage.setItem('lastMusicFetchTime', currentTime.toString());
                
                const finalPlaylist = JSON.parse(localStorage.getItem('playList')) || playLists;
                setPlayList(finalPlaylist);
                
                if (finalPlaylist.length > 0) {
                    const initialIndex = Number(localStorage.getItem('playListIndex')) || 0;
                    setCurrentSongIndex(initialIndex);
                    // 直接更新歌曲名显示
                    switchElementContent(
                        '#music-name',
                        <Virgule text={finalPlaylist[initialIndex].name} />,
                        0
                    );
                }
            });
    }

    const calculateAnimationStyle = (index, targetIndex, progress) => {
        if (!isAnimating || animationTarget === null) return {};

        // 计算实际的偏移量，考虑循环情况
        let offset = targetIndex - currentSongIndex;
        const totalLength = playList.length;

        if (Math.abs(offset) > totalLength / 2) {
            if (offset > 0) {
                offset = offset - totalLength;
            } else {
                offset = offset + totalLength;
            }
        }

        const itemPosition = index - currentSongIndex;
        let adjustedPosition = itemPosition;

        if (Math.abs(itemPosition) > totalLength / 2) {
            if (itemPosition > 0) {
                adjustedPosition = itemPosition - totalLength;
            } else {
                adjustedPosition = itemPosition + totalLength;
            }
        }

        // 新增：计算图片透明度
        let imageOpacity = 1;
        if (adjustedPosition >= offset && Math.abs(adjustedPosition) < 10) {
            imageOpacity = adjustedPosition === offset ? progress : progress * 0.8 + 0.2;
        }

        if (adjustedPosition < offset) {
            return {
                opacity: 1 - progress,
                transform: `scale(${1 - progress})`,
            };
        }

        if (adjustedPosition >= offset && Math.abs(adjustedPosition) < 10) {
            const startLeft = `calc(${adjustedPosition} * ${gapCss})`;
            const endLeft = `calc(${adjustedPosition - offset} * ${gapCss})`;
            const currentLeft = `calc(${startLeft} + (${endLeft} - ${startLeft}) * ${progress})`;
            return {
                left:
                    adjustedPosition === offset
                        ? `calc(0px + (${currentLeft} - 0px) * (1 - ${progress}))`
                        : currentLeft,
                '--image-opacity': imageOpacity, // 新增：传递图片透明度变量
            };
        }

        return {};
    };

    const preloadImage = (src) => {
        return new Promise((resolve, reject) => {
            if (preloadedImages[src]) {
                resolve();
                return;
            }
            const img = new Image();
            img.onload = () => {
                setPreloadedImages((prev) => ({ ...prev, [src]: true }));
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
    };

    async function switchSong(index) {
        if (index === currentSongIndex || isAnimating || index > playList.length) {
            localStorage.setItem('playListIndex', 0);
            return;
        }
        console.log(index);
        localStorage.setItem('playListIndex', index);
        const nextItemsToShow = [];
        for (let i = 0; i < 10; i++) {
            nextItemsToShow.push(playList[(index + i) % playList.length]);
        }

        setTimeout(() => {
            document.querySelectorAll('.ready-to-show').forEach((item) => {
                item.style.opacity = 1;
            });
        }, 700);

        try {
            await Promise.all(nextItemsToShow.map((item) => preloadImage(item.pic)));

            setIsAnimating(true);
            setAnimationTarget(index);

            // 使用Promise来确保状态更新完成
            await new Promise((resolve) => {
                setTimeout(() => {
                    const musicItem = playList[index];
                    musicChange(musicItem.name, musicItem.url);
                    setCurrentSongIndex(index);
                    setIsAnimating(false);
                    setAnimationTarget(null);
                    resolve();
                }, 500);
            });
        } catch (error) {
            console.error('Error in switchSong:', error);
            setIsAnimating(true);
            setAnimationTarget(index);
        }
    }

    const resetInteractionTimer = () => {
        setLastInteractionTime(Date.now());
        if (autoScrollTimerRef.current) {
            clearTimeout(autoScrollTimerRef.current);
        }
        autoScrollTimerRef.current = setTimeout(() => {
            scrollToPlayingSong();
        }, 3000);
    };

    const delFromPlayList = (name) => {
        const updatedPlayList = JSON.parse(localStorage.getItem('playList')).filter(
            (item) => item.name !== name,
        );
        if (JSON.parse(localStorage.getItem('playList'))[currentSongIndex]?.name === name) {
            switchSong((currentSongIndex + 1) % updatedPlayList.length);
        }
        setPlayList(updatedPlayList);
        localStorage.setItem('playList', JSON.stringify(updatedPlayList));
    };

    useEffect(() => {
        on('musicChange', musicChange);
        on('addToPlayList', addToPlayList);
        on('musicPlay', musicPlay);
        on('musicUpdata', musicUpdata);
        on('musicLoad', getRecommandMusic);
        on('playToList', playToList);
        on('delFromPlayList', delFromPlayList);
        setPlayList(JSON.parse(localStorage.getItem('playList')) || []);
        setCurrentSongIndex(Number(localStorage.getItem('playListIndex')) || 0);
        return () => {
            off('musicChange', musicChange);
            off('musicPlay', musicPlay);
            off('addToPlayList', addToPlayList);
            off('musicUpdata', musicUpdata);
            off('musicLoad', getRecommandMusic);
            off('playToList', playToList);
            off('delFromPlayList', delFromPlayList);
            if (autoScrollTimerRef.current) {
                clearTimeout(autoScrollTimerRef.current);
            }
        };
    }, []);

    const itemsToShow = [];
    if (playList.length > 0) {
        for (let i = 0; i < 10; i++) {
            itemsToShow.push(playList[(currentSongIndex + i) % playList.length]);
        }
    }
    const gapCss =
        itemsToShow.length > 1 ? `calc((100% - 80px) / ${itemsToShow.length - 1})` : '0px';

    useEffect(() => {
        if (document.querySelector('#music-name').innerText == playList[currentSongIndex]?.name) {
            return;
        }
        localStorage.setItem('playListIndex', localStorage.getItem("playListIndex") || currentSongIndex);
        switchElementContent(
            '#music-name',
            <Virgule
                text={
                    playList[currentSongIndex]
                        ? playList[currentSongIndex].name
                        : '无正在播放的音乐'
                }
            />,
        );
        scrollToPlayingSong();
    }, [currentSongIndex, playList]);

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <div
                    id='playlist-albums'
                    style={{
                        position: 'relative',
                        width: '50%',
                        height: '80px',
                        margin: '0 10px 0 0',
                    }}
                >
                    {itemsToShow.map((musicItem, index) => (
                        <div
                            key={`${currentSongIndex}-${index}`}
                            onMouseEnter={() => setAlbumHoverIndex(index)}
                            onMouseLeave={() => {
                                setAlbumHoverIndex(null);
                                scrollToPlayingSong();
                            }}
                            data-umami-event-music={`music-album-click-${musicItem?.name}`}
                            onClick={() => switchSong(currentSongIndex + index)}
                            className={index > 8 ? 'ready-to-show' : ''}
                            style={{
                                position: 'absolute',
                                left: index === 0 ? '0px' : `calc(${index} * ${gapCss})`,
                                zIndex: itemsToShow.length - index,
                                width: '80px',
                                height: '80px',
                                overflow: 'hidden',
                                borderRadius: '8px',
                                transition: isAnimating ? 'all 500ms ease' : 'all 300ms ease',
                                backfaceVisibility: 'hidden',
                                willChange: 'transform, opacity',
                                opacity: index > 8 ? 0 : 1,
                                transform:
                                    albumHoverIndex === index
                                        ? 'translateY(-15px)'
                                        : 'translateY(0)',
                                '--image-opacity': 1, // 默认透明度
                                ...calculateAnimationStyle(
                                    currentSongIndex + index,
                                    animationTarget,
                                    isAnimating ? 1 : 0,
                                ),
                            }}
                        >
                            <img
                                src={musicItem ? musicItem.pic : '/music.png'}
                                alt={musicItem ? musicItem.album : ''}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    backfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)',
                                    opacity: 'var(--image-opacity)', // 使用CSS变量控制透明度
                                    transition: 'opacity 500ms ease', // 添加透明度过渡效果
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div
                    id='playlist-title'
                    ref={playlistRef}
                    onMouseEnter={() => {
                        if (autoScrollTimerRef.current) {
                            clearTimeout(autoScrollTimerRef.current);
                        }
                    }}
                    onMouseLeave={() => {
                        scrollToPlayingSong();
                    }}
                    onWheel={resetInteractionTimer}
                    onTouchStart={resetInteractionTimer}
                    onTouchMove={resetInteractionTimer}
                    style={{
                        width: '50%',
                        height: '80px',
                        overflow: 'auto',
                    }}
                >
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                        {playList.map((item, idx) => (
                            <li
                                key={idx}
                                onMouseEnter={() => setHoverIndex(idx)}
                                onMouseLeave={() => {
                                    setHoverIndex(null);
                                }}
                                style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        color:
                                            idx === currentSongIndex
                                                ? 'var(--theme-white-light)'
                                                : 'var(--theme-white)',
                                        fontWeight: idx === currentSongIndex ? 'bold' : 'normal',
                                    }}
                                >
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
                                            }}
                                        >
                                            &nbsp;&nbsp;&nbsp;&nbsp;
                                            <span
                                                className='ri-delete-bin-6-fill'
                                                data-umami-event-music={`music-delete-${item.name}`}
                                                onClick={() => {
                                                    if (idx === currentSongIndex) {
                                                        switchSong(
                                                            (currentSongIndex + 1) %
                                                                playList.length,
                                                        );
                                                    }
                                                    setPlayList(
                                                        playList.filter((_, i) => i !== idx),
                                                    );
                                                    localStorage.setItem(
                                                        'playList',
                                                        JSON.stringify(playList),
                                                    );
                                                }}
                                            ></span>
                                            <span
                                                className='ri-play-fill'
                                                data-umami-event-music={`music-play-${item.name}`}
                                                onClick={() => switchSong(idx)}
                                            ></span>
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
                    <div
                        id='music-name'
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                        }}
                    >
                        无正在播放的音乐
                    </div>
                    <div id='music-time'>00:00/00:00</div>
                </div>
                <audio
                    id='music'
                    src={playList[currentSongIndex] ? playList[currentSongIndex].url : '/'}
                    onTimeUpdate={() => {
                        musicUpdata();
                    }}
                    onEnded={() => {
                        switchSong((currentSongIndex + 1) % playList.length);
                        musicPlay();
                    }}
                    onError={() => {
                        switchSong((currentSongIndex + 1) % playList.length);
                        musicPlay();
                    }}
                    loop={false}
                    preload='none'
                ></audio>
                <div id='music-bar'>
                    <div id='music-progress-container' onMouseDown={handleProgressMouseDown}>
                        <div id='music-progress'></div>
                    </div>
                </div>
                <div id='music-operation'>
                    <span>
                        <span
                            data-umami-event-music='music-list'
                            onClick={() => {
                                emit('closeInfobar');
                                setTimeout(() => {
                                    emit('openInfobar', 'music');
                                }, 500);
                            }}
                        >
                            <span className='i ri-play-list-line'></span>
                        </span>
                    </span>

                    <span>
                        <span
                            data-umami-event-music='music-prev'
                            className='i ri-skip-back-line'
                            onClick={() => {
                                switchSong(
                                    (currentSongIndex - 1 + playList.length) % playList.length,
                                );
                            }}
                        ></span>
                    </span>
                    <span>
                        <span
                            data-umami-event-music='music-play'
                            id='music-button'
                            onClick={() => {
                                musicPlay();
                            }}
                        >
                            <span className='i ri-play-line'></span>
                        </span>
                    </span>
                    <span>
                        <span
                            className='i ri-skip-forward-line'
                            onClick={() => {
                                switchSong((currentSongIndex + 1) % playList.length);
                            }}
                        ></span>
                    </span>
                    <span>
                        {isLoop ? (
                            <span
                                data-umami-event-music='music-cancle-loop'
                                className='i ri-repeat-one-line'
                                onClick={() => {
                                    setIsLoop(false);
                                    music.loop = false;
                                }}
                            ></span>
                        ) : (
                            <span
                                data-umami-event-music='music-set-loop'
                                className='i ri-order-play-fill'
                                onClick={() => {
                                    setIsLoop(true);
                                    music.loop = true;
                                }}
                            ></span>
                        )}
                    </span>
                </div>
            </div>
        </>
    );
}
