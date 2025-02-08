'use client';

import { useEffect } from 'react';

const styles = {
    imgPlaceholder: {
        display: 'inline-block',
    },
    expandedImage: {
        position: 'fixed',
        zIndex: 1000,
        cursor: 'zoom-out',
        maxWidth: 'none',
        maxHeight: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        objectFit: 'contain',
        transformOrigin: 'top left',
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        zIndex: 999,
        cursor: 'zoom-out',
        transition: 'opacity 0.3s ease',
    },
    zoomableImg: {
        cursor: 'zoom-in',
    },
};

export default function ImageZoom() {
    useEffect(() => {
        function handleImageClick(img) {
            if (document.querySelector('.image-zoom-overlay')) {
                return;
            }

            const rect = img.getBoundingClientRect();

            const overlay = document.createElement('div');
            overlay.className = 'image-zoom-overlay';
            Object.assign(overlay.style, styles.overlay);

            const placeholder = document.createElement('div');
            Object.assign(placeholder.style, {
                width: rect.width + 'px',
                height: rect.height + 'px',
                ...styles.imgPlaceholder,
            });

            const clone = img.cloneNode(true);
            clone.className = 'image-zoom-clone';
            Object.assign(clone.style, {
                ...styles.expandedImage,
                left: rect.left + 'px',
                top: rect.top + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px',
                transform: 'none',
                opacity: '1',
            });

            document.body.appendChild(overlay);
            document.body.appendChild(clone);
            img.parentNode.insertBefore(placeholder, img);
            img.style.display = 'none';

            clone.offsetHeight;

            requestAnimationFrame(() => {
                const maxWidth = window.innerWidth * 0.9;
                const maxHeight = window.innerHeight * 0.9;
                const scale = Math.min(maxWidth / rect.width, maxHeight / rect.height, 15);

                const scaledWidth = rect.width * scale;
                const scaledHeight = rect.height * scale;

                const translateX = (window.innerWidth - scaledWidth) / 2 - rect.left;
                const translateY = (window.innerHeight - scaledHeight) / 2 - rect.top;

                Object.assign(clone.style, {
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                });
            });

            const closeImage = () => {
                Object.assign(clone.style, {
                    transform: 'none',
                });
                overlay.style.opacity = '0';

                setTimeout(() => {
                    img.style.display = '';
                    placeholder.remove();
                    clone.remove();
                    overlay.remove();
                }, 300);
            };

            clone.onclick = closeImage;
            overlay.onclick = closeImage;
        }

        document.querySelectorAll('img[data-zoomable]').forEach((img) => {
            img.removeEventListener('click', () => handleImageClick(img));
        });

        const images = document.querySelectorAll('img[data-zoomable]');
        images.forEach((img) => {
            img.setAttribute('data-umami-event', 'zoom-image');
            Object.assign(img.style, styles.zoomableImg);
            img.addEventListener('click', () => handleImageClick(img));
        });

        return () => {
            images.forEach((img) => {
                img.removeEventListener('click', () => handleImageClick(img));
            });
        };
    }, []);

    return null;
}
