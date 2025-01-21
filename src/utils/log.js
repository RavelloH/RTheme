const subscribers = [];

// 添加订阅方法
export function subscribe(fn) {
    subscribers.push(fn);
}

// 添加取消订阅方法
export function unsubscribe(fn) {
    const index = subscribers.indexOf(fn);
    if (index > -1) {
        subscribers.splice(index, 1);
    }
}

// 通知所有订阅者
function notify() {
    subscribers.forEach(fn => fn());
}

const log = {
    data: [
        {
            time: new Date().toISOString(),
            content: "Log.js started.",
            level: "info"
        }
    ],
    info: function (content) {
        log.data.push({
            time: new Date().toISOString(),
            content: content,
            level: "info"
        });
        notify();
    },
    error: function (content) {
        log.data.push({
            time: new Date().toISOString(),
            content: content,
            level: "error"
        });
        notify();
    },
    warn: function (content) {
        log.data.push({
            time: new Date().toISOString(),
            content: content,
            level: "warn"
        });
        notify();
    }
}

// 保存原始的 console 方法
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
};

// 重写 console.log
console.log = function(...args) {
    const message = args.join(' ');
    log.info(message);
};

// 重写 console.warn
console.warn = function(...args) {
    const message = args.join(' ');
    log.warn(message);
};

// 重写 console.error
console.error = function(...args) {
    const message = args.join(' ');
    log.error(message);
};

// 捕获全局错误
if (typeof window !== 'undefined') {
    window.onerror = function(message, source, lineno, colno, error) {
        log.error(`${message} at ${source}:${lineno}:${colno}`);
    };

    // 捕获未处理的 Promise 拒绝
    window.onunhandledrejection = function(event) {
        log.error(`Unhandled promise rejection: ${event.reason}`);
    };
}

export default log;