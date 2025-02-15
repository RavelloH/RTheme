'use client';

import { useEffect } from 'react';
import { useBroadcast } from '@/store/useBroadcast';

export default function ShadeContent() {
    const boardcast = useBroadcast((state) => state.broadcast);
    return (
        <div
            id='shade-context'
            data-umami-event='shade-context'
            onClick={() => {
                boardcast({ type: 'UI', action: 'closeSidebar' });
                boardcast({ type: 'UI', action: 'closeUserbar' });
            }}
        ></div>
    );
}
