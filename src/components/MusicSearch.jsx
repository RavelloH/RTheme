'use client';

import switchElementContent from '@/utils/switchElement';
import config from '../../config';
import ImageZoom from './ImageZoom';
import { useEvent } from '@/store/useEvent';
import { useEffect } from 'react';

export default function MusicSearch() {
    const { emit, on, off } = useEvent();
    let searchTimer;

    function getstructureMusicSearchResult(name, url, artist, pic, album) {
        return (
            <div className='music-search-list loading'>
                <div className='music-search-result'>
                    <div className='music-search-info'>
                        <div className='music-search-img'>
                            <img src={pic} loading='lazy' alt={name} data-zoomable />
                        </div>
                        <div className='music-search-title'>
                            <span className='music-search-name'>{name}</span>
                            <span className='music-search-author'>
                                {' '}
                                <span className='i_small ri-account-box-line'></span> {artist} -{' '}
                                <span className='i_small ri-mv-line'></span> {album}
                            </span>
                        </div>
                    </div>
                    <div className='music-search-operation'>
                        <span>
                            <span
                                className='i ri-add-fill'
                                onClick={() => {
                                    emit('musicAddToList', `${name} - ${artist}`, url);
                                }}></span>
                        </span>
                        <span
                            className='i ri-play-fill'
                            onClick={() => {
                                emit('musicChange', `${name} - ${artist}`, url);
                            }}></span>
                    </div>
                </div>
                <hr />
            </div>
        );
    }

    function loadItems(parentNodeName, mode = 'sort') {
        if (mode === 'sort') {
            for (
                let j = document.querySelectorAll(parentNodeName + ' .loading').length;
                j > 0;
                j--
            ) {
                document
                    .querySelectorAll(parentNodeName + ' .loading')
                    [j - 1].setAttribute('style', '--i: ' + j);
            }
        }
        document.querySelectorAll(parentNodeName + ' .loading').forEach((e) => {
            e.classList.add('loaded');
        });
    }

    function musicSearch(name) {
        if (name !== '') {
            switchElementContent(
                '#music-search-program',
                <div className='square-loader'>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>,
            );
            if (typeof searchTimer !== 'undefined') {
                clearTimeout(searchTimer);
            }
            searchTimer = setTimeout(function () {
                fetch(config.musicApi + 'cloudsearch?keywords=' + name)
                    .then((response) => response.json())
                    .then((data) => {
                        let musicSearchResult = [];
                        for (let i = 0; i < data['result']['songs'].length; i++) {
                            var artists = '';
                            for (let j = 0; j < data['result']['songs'][i]['ar'].length; j++) {
                                artists =
                                    artists + data['result']['songs'][i]['ar'][j]['name'] + '/';
                            }
                            artists = artists.substring(0, artists.length - 1);
                            musicSearchResult.push(
                                getstructureMusicSearchResult(
                                    data['result']['songs'][i]['name'],
                                    'http://music.163.com/song/media/outer/url?id=' +
                                        data['result']['songs'][i]['id'] +
                                        '.mp3',
                                    artists,
                                    data['result']['songs'][i]['al']['picUrl'],
                                    data['result']['songs'][i]['al']['name'],
                                ),
                            );
                        }
                        musicSearchResult.push(<ImageZoom />);
                        switchElementContent('#music-search-program', musicSearchResult, 200);
                        setTimeout(() => {
                            loadItems('#music-search-program');
                        }, 310);
                    })
                    .catch((error) => {
                        switchElementContent(
                            '#music-search-program',
                            <div className='info-alert center'>
                                <strong>
                                    <span className='i_small ri-spam-line'></span> {error}
                                </strong>
                            </div>,
                        );
                    });
            }, 1000);
        }
    }

    function getRecommandMusic() {
        const recommandMusicList = JSON.parse(localStorage.getItem('recommandMusic'));
        if (recommandMusicList.length === 0) {
            return;
        }
        let recommandMusic = [];
        for (let i = 0; i < recommandMusicList.length; i++) {
            recommandMusic.push(
                getstructureMusicSearchResult(
                    recommandMusicList[i].name,
                    recommandMusicList[i].url,
                    recommandMusicList[i].artist,
                    recommandMusicList[i].pic,
                    recommandMusicList[i].album,
                ),
            );
        }
        recommandMusic.push(<ImageZoom />);
        setTimeout(() => {
            switchElementContent('#music-search-program', recommandMusic, 200);
        }, 300);
        setTimeout(() => {
            loadItems('#music-search-program');
        }, 600);
    }
    useEffect(() => {
        getRecommandMusic();
    }, []);

    return (
        <>
            <br />
            <div className='form-control'>
                <input
                    type='search'
                    required={true}
                    onInput={() => musicSearch(document.querySelector('#music-search-input').value)}
                    onChange={() =>
                        musicSearch(document.querySelector('#music-search-input').value)
                    }
                    id='music-search-input'
                />
                <label>
                    <span className='i_small ri-search-2-line' style={{ '--i': 0 }}>
                        &nbsp;
                    </span>
                    <span style={{ '--i': 1 }}>搜</span>
                    <span style={{ '--i': 2 }}>索</span>
                    <span style={{ '--i': 3 }}>在</span>
                    <span style={{ '--i': 4 }}>线</span>
                    <span style={{ '--i': 5 }}>资</span>
                    <span style={{ '--i': 6 }}>源</span>
                    <span style={{ '--i': 7 }}>.</span>
                    <span style={{ '--i': 8 }}>.</span>
                    <span style={{ '--i': 9 }}>.</span>
                </label>
            </div>
            <div id='music-search-program'>
                <div className='square-loader'>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div id='alert-info'></div>
        </>
    );
}
