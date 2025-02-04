'use client';

import React, { useEffect, useRef } from 'react';

const Virgule = ({ text, interval = 20, inline = false, timeout }) => {
    const elementRef = useRef(null);

    useEffect(() => {
        const loadVirgule = async () => {
            let vir = (await import('virgule-js')).default;
            let targetList = vir(text);
            let doneTime = 0;
            let virguleTimer = setInterval(() => {
                doneTime++;
                if (elementRef.current) {
                    elementRef.current.innerHTML = targetList[doneTime - 1];
                }
                if (doneTime === targetList.length) {
                    clearInterval(virguleTimer);
                }
            }, interval);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setTimeout(() => {
                        loadVirgule();
                    }, timeout);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 },
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [text, interval, inline, timeout]);

    return inline ? <span ref={elementRef}>/</span> : <div ref={elementRef}>/</div>;
};

export default Virgule;
