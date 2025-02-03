'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBroadcast } from '@/store/useBoardcast';

const Pjax = ({ children }) => {
    const [loadStart, setLoadStart] = useState(false);
    const [userClick, setUserClick] = useState(false);
    const router = useRouter();
    const boardcast = useBroadcast((state) => state.broadcast);
    const pathname = usePathname();

    useEffect(() => {
        const handleClick = (e) => {
            setUserClick(true);
            setTimeout(() => setUserClick(false), 300);
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

            e.preventDefault();
            if (target.pathname === location.pathname) return;
            boardcast({ type: 'LOAD', action: 'loadStart' });
            setLoadStart(true);

            router.prefetch(href);
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
        const handlePopState = (e) => {
            boardcast({ type: 'LOAD', action: 'loadEnd' });
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [router, boardcast]);

    return children || null;
};

export default Pjax;
