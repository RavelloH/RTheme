const notice = {
    check: () => {
        return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    },
    request: () => {
        if (typeof Notification === 'undefined') {
            return false;
        }
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                notice.send('通知开启成功', '通知功能已成功开启,可在设置中随时关闭', '/icon/512x');
            } else {
                return false;
            }
        });
    },
    send: (title, body, icon = '/icon/512x') => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            return;
        }
        const options = {
            body: body,
            icon: icon,
        };
        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    },
    close: () => {
        if (typeof Notification !== 'undefined') {
            Notification.close();
        }
    },
};

export default notice;
