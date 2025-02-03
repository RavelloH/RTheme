'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBroadcast } from '@/store/useBoardcast';

const Pjax = ({ children }) => {
    const [loadStart, setLoadStart] = useState(false);
    const router = useRouter();
    const boardcast = useBroadcast((state) => state.broadcast);
    const pathname = usePathname();

    useEffect(() => {
        const handleClick = (e) => {
            const target = e.target.closest('a');
            if (
                !target ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                target.target === '_blank' ||
                target.target === '_self'
            ) {
                return;
            }

            const href = target.href;
            if (
                !href ||
                new URL(href).origin !== location.origin ||
                href.replace(location.origin + '/', '').startsWith('#')
            )
                return;

            if (target.href === location.href) {
                router.refresh();
                return;
            }

            e.preventDefault();

            // 触发加载状态广播（例如用于显示加载动画）
            boardcast({ type: 'LOAD', action: 'loadStart' });
            setLoadStart(true);

            // 使用 Next.js Router API 进行页面跳转
            fetch(href);
            setTimeout(() => {
                router.push(href);
            }, 300);
        };

        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [router, boardcast]);

    useEffect(() => {
        // 仅当存在loadStart状态时，才会触发loadEnd状态
        if (!loadStart) return;
        boardcast({ type: 'LOAD', action: 'loadEnd' });
        setLoadStart(false);
    }, [pathname]);

    useEffect(() => {
        const handlePopState = () => {
            boardcast({ type: 'LOAD', action: 'loadStart' });
            setLoadStart(true);
            setTimeout(() => {
                router.push(location.href);
            }, 300);
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [router, boardcast]);

    return children || null;
};

export default Pjax;
