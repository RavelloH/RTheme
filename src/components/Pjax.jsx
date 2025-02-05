'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBroadcast } from '@/store/useBroadcast';

const Pjax = ({ children }) => {
    const [loadStart, setLoadStart] = useState(false);
    const router = useRouter();
    const broadcast = useBroadcast((state) => state.broadcast);
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

            e.preventDefault();
            if (target.pathname === location.pathname) return;
            broadcast({ type: 'LOAD', action: 'loadStart' });
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
    }, [router, broadcast]);

    useEffect(() => {
        if (!loadStart) return;
        broadcast({ type: 'LOAD', action: 'loadEnd' });
        setLoadStart(false);
    }, [pathname]);

    useEffect(() => {
        const handlePopState = (e) => {
            broadcast({ type: 'LOAD', action: 'loadEnd' });
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [router, broadcast]);

    return children || null;
};

export default Pjax;
