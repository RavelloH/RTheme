'use client';

import { useEffect, useState } from 'react';
import { getPageVisitors } from './PageVisitors';
import switchElementContent from '@/utils/switchElement';
import getTime from '@/utils/getTime';
import config from '../../config';

function getTimeFromSec(totaltime) {
    const days = Math.floor(totaltime / (24 * 3600));
    const hours = Math.floor((totaltime % (24 * 3600)) / 3600);
    const minutes = Math.floor((totaltime % 3600) / 60);
    const seconds = Math.floor(totaltime % 60);
    let result = '';
    if (days) result += `${days}天`;
    if (hours) result += `${hours}小时`;
    if (minutes) result += `${minutes}分钟`;
    if (seconds) result += `${seconds}秒`;
    return result;
}

function structureUptime(name, status, url, index) {
    let Icon;
    if (status == 'up') {
        Icon = <span className='i ri-check-fill'></span>;
    } else {
        Icon = <span className='i ri-signal-wifi-error-fill'></span>;
    }
    return (
        <a
            href={url}
            className='no-effect'
            target='_blank'
            key={index}
            data-umami-event={'uptime-click-' + name}
        >
            <div>
                {Icon} <span>{name}</span>
            </div>
        </a>
    );
}

export default function Info() {
    const [url, setUrl] = useState('');
    const [networkState, setNetworkState] = useState(false);
    const [cookieEnabled, setCookieEnabled] = useState(false);
    const [readyState, setReadyState] = useState('---');
    const [referrer, setReferrer] = useState('---');
    const [uptime, setUptime] = useState('---');
    const [uptimeData, setUptimeData] = useState({});

    useEffect(() => {
        setUrl(window.location.pathname);
        setNetworkState(navigator.onLine);
        getPageVisitors(window.location.pathname).then((data) => {
            switchElementContent('#url-visitors', data['visitors'].value);
            switchElementContent('#url-visit', data['pageviews'].value);
            switchElementContent(
                '#url-visit-time',
                getTimeFromSec(data['totaltime'].value / data['visits'].value),
            );
        });
        setCookieEnabled(navigator.cookieEnabled);
        setReadyState(document.readyState);
        setReferrer(document.referrer);
        setUptime(getTime('DD天hh小时mm分钟', config.siteBirthday));

        if (config.uptime.apiUrl) {
            const cache = localStorage.getItem('uptimeData');
            const now = Date.now();
            if (cache) {
                const { data, timestamp } = JSON.parse(cache);
                if (now - timestamp < 5 * 60 * 1000) {
                    setUptimeData(data);
                } else {
                    fetch(config.uptime.apiUrl, {})
                        .then((response) => response.json())
                        .then((data) => {
                            setUptimeData(data);
                            localStorage.setItem(
                                'uptimeData',
                                JSON.stringify({ data, timestamp: Date.now() }),
                            );
                        });
                }
            } else {
                fetch(config.uptime.apiUrl, {})
                    .then((response) => response.json())
                    .then((data) => {
                        setUptimeData(data);
                        localStorage.setItem(
                            'uptimeData',
                            JSON.stringify({ data, timestamp: Date.now() }),
                        );
                    });
            }
        }

        const timer = setInterval(() => {
            if (document.querySelector('#infobar').classList.contains('active')) {
                switchElementContent('#up-time', getTime('DD天hh小时mm分钟', config.siteBirthday));
            } else {
                clearInterval(timer);
            }
        }, 1000);
    }, []);

    useEffect(() => {
        if (!uptimeData.data) return;
        let result = [];
        uptimeData.data.forEach((e, index) => {
            result.push(
                structureUptime(
                    e.attributes.pronounceable_name,
                    e.attributes.status,
                    e.attributes.url,
                    index + 1,
                ),
            );
        });
        switchElementContent('#uptime-list', result);
    }, [uptimeData]);
    return (
        <>
            <br />
            <h4>框架状态</h4>
            <br />
            <div className='flex-items'>
                <strong> URL: </strong>
                <span>{url}</span>
            </div>
            <div className='flex-items'>
                <strong> 来源: </strong>
                <span>{referrer ? referrer : 'Direct'}</span>
            </div>
            <div className='flex-items'>
                <strong> 此页访问量: </strong>
                <span id='url-visit'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 此页访问人数: </strong>
                <span id='url-visitors'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 此页平均滞留: </strong>
                <span id='url-visit-time'>
                    <div className='circle-loader'></div>
                </span>
            </div>
            <div className='flex-items'>
                <strong> 网络连接状态: </strong>
                <span>{networkState ? '就绪' : <span className='red'>离线</span>}</span>
            </div>
            <div className='flex-items'>
                <strong> Cookie状态: </strong>
                <span>{cookieEnabled ? '已启用' : <span className='red'>已禁用</span>}</span>
            </div>
            <div className='flex-items'>
                <strong> 页面加载状态: </strong>
                <span>
                    {
                        {
                            loading: '加载中',
                            interactive: '可供交互',
                            complete: '完成',
                        }[readyState]
                    }
                </span>
            </div>
            <div className='flex-items'>
                <strong> 站点运行时长: </strong>
                <span id='up-time'>{uptime}</span>
            </div>
            <hr />
            <div id='alert-info'></div>
            <div className='full center' id='uptime-list'></div>
        </>
    );
}
