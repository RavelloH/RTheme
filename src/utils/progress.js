'use client';

import FooterIcon from '../components/FooterIcon.jsx';
import ReactDOM from 'react-dom/client';

function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const progress = {
    number: 0,
    bar: null,
    father: null,
    addTimer: null,
    state: '',
    root: null,
    show: function () {
        progress.number = 0;

        document.querySelector('#icons-left').style.opacity = '1';
        document.querySelector('#icons-left').style.transition = 'opacity 100ms';
        document.querySelector('#icons-left').style.opacity = '0';

        new Promise((resolve) => {
            setTimeout(() => {
                if (progress.root !== null) {
                    progress.root.unmount();
                }
                progress.root = ReactDOM.createRoot(document.querySelector('#icons-left'));
                progress.root.render(
                    <ul>
                        <li>
                            <div id='progress-container'>
                                <div id='progress'></div>
                            </div>
                        </li>
                    </ul>,
                );
                document.querySelector('#icons-left').style.opacity = '1';
                resolve();
            }, 300);
        }).then(() => {
            progress.bar = document.querySelector('#progress');
            progress.father = document.querySelector('#progress-container');
            setTimeout(function () {
                if (progress.state == 'sending') {
                    progress.change(getRandomInteger(5, 15), progress.bar);
                }
            }, 100);
            setTimeout(function () {
                if (progress.state == 'sending') {
                    progress.change(progress.number + getRandomInteger(10, 25), progress.bar);
                }
            }, 300);
            progress.addTimer = setInterval(function () {
                if (progress.number >= 85 || progress.state == 'success') {
                    clearInterval(progress.addTimer);
                    return false;
                }
                if (progress.number >= 10 && progress.state == 'sending') {
                    if (progress.number >= 70) {
                        progress.bar.classList.add('yellow');
                        progress.change(progress.number + getRandomInteger(0, 2));
                    } else {
                        progress.change(progress.number + getRandomInteger(0, 10));
                    }
                }
            }, 500);
        });
    },
    error: function () {
        setTimeout(function () {
            clearInterval(progress.addTimer);
            progress.bar = document.querySelector('#progress');
            progress.bar.classList.add('red');
            progress.change(100);
            progress.state = 'closing';

            setTimeout(function () {
                if (progress.state == 'closing') {
                    progress.close();
                }
            }, 2000);
        }, 310);
    },
    change: function (num) {
        if (progress.state == 'success') {
            return false;
        }
        if (num <= progress.number) {
            return false;
        }
        progress.bar = document.querySelector('#progress');
        if (progress >= 99) {
            if (!progress.bar) return;
            progress.bar.style.width = `100%`;
            progress.bar.classList.remove('yellow');
            progress.number = 100;
        } else {
            if (!progress.bar) return;
            progress.bar.style.width = `${num}%`;
            progress.number = num;
        }
    },
    close: function () {
        if (!progress.bar) {
            return;
        }
        if (progress.bar.classList[0] == 'yellow') {
            progress.bar.classList.toggle('yellow');
        }
        if (progress.state !== '') {
            document.querySelector('#icons-left').style.opacity = '1';
            document.querySelector('#icons-left').style.transition = 'opacity 100ms';
            document.querySelector('#icons-left').style.opacity = '0';

            new Promise(function (resolve) {
                setTimeout(() => {
                    progress.root.unmount();
                    progress.root = ReactDOM.createRoot(document.querySelector('#icons-left'));
                    progress.root.render(
                        <nav>
                            <FooterIcon />
                        </nav>,
                    );

                    document.querySelector('#icons-left').style.opacity = '1';
                    progress.state = '';
                    resolve();
                }, 300);
            });
        }
    },
    full: function () {
        setTimeout(() => {
            clearInterval(progress.addTimer);
            setTimeout(() => {
                progress.change(100);
            }, 50);
        }, 300);
        setTimeout(() => progress.close(), 1000);
    },
};

export default progress;
