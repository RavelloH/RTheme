'use client';

import { useEffect } from 'react';
import { useBroadcast } from '@/store/useBoardcast';

const Pjax = ({ selectors = ['#main', 'title'], timeout = 30000, children }) => {
    const boardcast = useBroadcast((state) => state.broadcast);
    useEffect(() => {
        const handleClick = async (e) => {
            const target = e.target.closest('a');
            if (!target || e.ctrlKey || e.metaKey || e.shiftKey || target.target === '_blank')
                return;

            const href = target.href;
            if (!href || new URL(href).origin !== location.origin) return;

            e.preventDefault();
            boardcast({
                type: 'LOAD',
                action: 'loadStart',
            });

            // 浏览器能力检测
            if (!('fetch' in window && 'pushState' in history)) {
                location.href = href;
                return;
            }

            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(href, {
                    signal: controller.signal,
                    headers: { 'X-PJAX': 'true' },
                });
                clearTimeout(timer);

                if (!response.ok) {
                    boardcast({
                        type: 'LOAD',
                        action: 'loadError',
                    });
                    if (response.status === 404) {
                        await handlePageUpdate(await response.text());
                    } else {
                        location.href = href;
                    }
                    return;
                }

                await handlePageUpdate(await response.text());
                history.pushState(null, '', href);
                boardcast({
                    type: 'LOAD',
                    action: 'loadEnd',
                });
            } catch (error) {
                location.href = href;
            }
        };

        const handlePageUpdate = async (html) => {
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            const updateDOM = () => {
                // 仅更新指定的选择器内容
                selectors.forEach((selector) => {
                    const oldElement = document.querySelector(selector);
                    const newElement = newDoc.querySelector(selector);

                    if (oldElement && newElement) {
                        oldElement.innerHTML = newElement.innerHTML;
                    }
                });

                // 处理脚本
                // const newScripts = newDoc.querySelectorAll('script');
                // newScripts.forEach((newScript) => {
                //     const script = document.createElement('script');
                //     script.textContent = newScript.textContent;
                //     Array.from(newScript.attributes).forEach((attr) => {
                //         script.setAttribute(attr.name, attr.value);
                //     });
                //     document.body.appendChild(script);
                // });

                // 处理样式
                const newStyles = newDoc.querySelectorAll('link[rel="stylesheet"]');
                newStyles.forEach((newStyle, index) => {
                    if (index === 0) return; // 忽略第0个元素
                    const style = document.createElement('link');
                    style.rel = 'stylesheet';
                    Array.from(newStyle.attributes).forEach((attr) => {
                        style.setAttribute(attr.name, attr.value);
                    });
                    document.head.appendChild(style);
                });
            };

            // 视图过渡
            if ('startViewTransition' in document) {
                document.startViewTransition(() => updateDOM());
            } else {
                updateDOM();
            }
        };

        document.addEventListener('click', handleClick);
        window.addEventListener('popstate', () => location.reload());

        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('popstate', () => location.reload());
        };
    }, [selectors, timeout]);

    return children || null;
};

export default Pjax;
