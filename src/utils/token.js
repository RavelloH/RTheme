'use client';

import cookie from '@/assets/js/lib/cookie';
import { Base64 } from 'js-base64';
import objectToForm from './objectToForm';
import message from './message';

// Base64模块
const base = {
    encryption: function (str) {
        return Base64.encode(str);
    },
    decrypt: function (str) {
        return Base64.decode(str);
    },
};

const token = {
    read: function (property) {
        if (cookie.getItem('usertoken') == null) {
            return undefined;
        } else {
            return JSON.parse(
                base.decrypt(cookie.getItem('usertoken').split('.')[1]).replace('\x00', ''),
            )[property];
        }
    },
    get: function () {
        if (cookie.getItem('usertoken') == null) {
            return undefined;
        } else {
            return cookie.getItem('usertoken');
        }
    },
    getObject: function () {
        if (cookie.getItem('usertoken') == null) {
            return undefined;
        } else {
            return JSON.parse(
                base.decrypt(cookie.getItem('usertoken').split('.')[1]).replace('\x00', ''),
            );
        }
    },
    refresh: function () {
        return new Promise((resolve, reject) => {
            fetch('/api/user/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: objectToForm({
                    token: token.get(),
                    expiredTime: token.read('exp') - token.read('iat') + 's',
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.token) {
                        cookie.setItem(
                            'usertoken',
                            data.token,
                            Number(token.read('exp') - token.read('iat')),
                        );
                        console.log(data.info.exp - data.info.iat);
                        message.success('已使用当前Token重新登陆');
                        resolve(data.token);
                    } else {
                        message.error(data.message);
                        console.log(data.message);
                    }
                })
                .catch((e) => {
                    reject(e);
                });
        });
    },
    clear: function () {
        cookie.removeItem('usertoken');
    },
    write: function (string, time) {
        cookie.setItem('usertoken', string, time);
    },
};

export default token;
