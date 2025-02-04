import config from '../../config';

let lastCallTimestamp = 0;
let lastCallResult = null;

export async function getRealTimeVisitors() {
    if (!config.umami.url) {
        return false;
    }
    const now = Date.now();
    if (lastCallResult && now - lastCallTimestamp < 60000) {
        return lastCallResult;
    }
    lastCallTimestamp = now;
    lastCallResult = fetch(`${config.umami.url}api/websites/${config.umami.id}/active`, {
        headers: {
            'x-umami-share-token': config.umami.token,
        },
    })
        .then((response) => response.json())
        .then((data) => data.x)
        .catch((error) => {
            lastCallResult = null;
            throw error;
        });
    return lastCallResult;
}
