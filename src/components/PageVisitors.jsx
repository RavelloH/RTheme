'use client';

import { useEffect, useState } from 'react';
import config from '../../config';

export default function PageVisitors({ url = window.location.pathname }) {
    const [visitors, setVisitors] = useState('---');
    useEffect(() => {
        if (!config.umami) return;
        const apiURL = `${config.umami.apiUrl}pageview?url=${url}`;
        fetch(apiURL)
            .then((response) => response.json())
            .then((data) => {
                setVisitors(data['pageviews'].value);
            });
    }, [url]);
    return <span>{visitors}</span>;
}

export function getPageVisitors(url) {
    return new Promise((resolve, reject) => {
        if (!config.umami) return reject('umami not enabled');
        const apiURL = `${config.umami.apiUrl}pageview?url=${url}`;
        fetch(apiURL)
            .then((response) => response.json())
            .then((data) => {
                resolve(data);
            });
    });
}
