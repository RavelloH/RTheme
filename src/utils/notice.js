const notice = {
    check: () => {
        Notification.permission === 'granted' ? true : false;
    },
    request: () => {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                this.send('通知', '通知功能已成功开启', '/icon/512x');
            } else {
                return false;
            }
        });
    },
    send: (title, body, icon) => {
        const options = {
            body: body,
            icon: icon,
        };
        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            notification.close();
        }
    },
    close: () => {
        Notification.close();
    }
}

export default notice;