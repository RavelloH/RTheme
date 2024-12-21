import switchElementContent from './switchElement';

const message = {
    queue: [],
    state: 'off',
    original: (
        <a>
            <div></div>
        </a>
    ),
    switch: function (context, time = 300) {
        switchElementContent('#message-bar', context, time);
    },
    error: function (text, time = 6000) {
        message.add(
            <a className='red'>
                <strong>错误:{text}</strong>&nbsp;<span className='ri-alert-line'></span>
            </a>,
            time,
        );
    },
    warn: function (text, time = 5000) {
        message.add(
            <a className='yellow'>
                <strong>警告:{text}</strong>&nbsp;<span className='ri-alarm-warning-line'></span>
            </a>,
            time,
        );
    },
    success: function (text, time = 3000) {
        message.add(
            <a className='green'>
                {text}&nbsp;<span className='ri-check-line'></span>
            </a>,
            time,
        );
    },
    add: function (context, lastTime, TransTime = 300) {
        if (message.state === 'off') {
            message.original = document.querySelector('#message-bar').innerHTML;
        }
        if (
            message.queue.some(
                (item) => item[0] == context && item[1] == lastTime && item[2] == TransTime,
            )
        ) {
            return false;
        } else {
            message.queue.push([context, lastTime, TransTime]);
        }

        if (message.state === 'off') {
            message.state = 'on';
            message.refresh();
        }
    },
    refresh: function () {
        if (message.queue.length === 0) {
            message.state = 'off';
            message.switch(message.original, 300);
        } else {
            message.switch(message.queue[0][0], message.queue[0][2]);
            setTimeout(() => {
                message.queue.shift();
                message.refresh();
            }, message.queue[0][1]);
        }
    },
};

export default message;
