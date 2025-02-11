'use client';

import { useEffect } from 'react';

const styles = {
    preview: {
        position: 'absolute',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        maxWidth: '400px',
        width: 'calc(100vw - 32px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        fontSize: '14px',
        transition: 'opacity 0.3s ease',
        opacity: 0,
        pointerEvents: 'none',
        color: '#fff',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)',
        overflow: 'hidden',
        '&.loading': {
            backgroundImage: 'none !important',
            animation: 'shimmer 2.5s infinite linear',
            backgroundSize: '400% 100%',
            background:
                'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
        },
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        lineHeight: '20px',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)',
    },
    title: {
        margin: '0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
        lineHeight: '20px',
        display: 'flex',
        alignItems: 'center',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
    },
    url: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        marginBottom: '12px',
        wordBreak: 'break-all',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        '-webkit-line-clamp': '2',
        '-webkit-box-orient': 'vertical',
        whiteSpace: 'normal',
        maxHeight: '2.6em',
    },
    warning: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)',
    },
};

export default function LinkPreview() {
    useEffect(() => {
        let currentPreview = null;
        let timeout = null;

        const createPreview = (link) => {
            const preview = document.createElement('div');
            preview.className = 'link-preview loading';
            const bgImageUrl = `https://screenshot.ravelloh.top/?url=${encodeURIComponent(
                link.href,
            )}&viewport=1600x800&cache=2592000`;

            Object.assign(preview.style, styles.preview);

            const url = link.href;
            const hostname = new URL(url).hostname;

            preview.innerHTML = `
                <div style="${Object.entries(styles.header)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';')}">
                    <h4 style="${Object.entries(styles.title)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(';')}">
                        ${hostname}
                    </h4>
                </div>
                <div style="${Object.entries(styles.url)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';')}">
                    ${url}
                </div>
                <div style="${Object.entries(styles.warning)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';')}">
                    <span class="i_mini ri-error-warning-fill"></span>
                    非本站站内链接，请注意外部链接的安全性
                </div>
            `;

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // 获取图片中心区域的亮度
                const imageData = ctx.getImageData(
                    img.width * 0.25,
                    img.height * 0.25,
                    img.width * 0.5,
                    img.height * 0.5,
                );
                const data = imageData.data;
                let brightness = 0;

                for (let i = 0; i < data.length; i += 4) {
                    brightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                }
                brightness = brightness / (data.length / 4) / 255;

                const textColor = brightness > 0.6 ? '#000' : '#fff';
                const textShadow =
                    brightness > 0.6
                        ? '0 1px 3px rgba(255, 255, 255, 0.9), 0 2px 6px rgba(255, 255, 255, 0.9)'
                        : '0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 6px rgba(0, 0, 0, 0.9)';

                preview.querySelectorAll('div, h4').forEach((el) => {
                    el.style.color = textColor;
                    el.style.textShadow = textShadow;
                });

                preview.classList.remove('loading');
                preview.style.backgroundImage = `url("${bgImageUrl}")`;
            };
            img.src = bgImageUrl;

            return preview;
        };

        const showPreview = (link) => {
            const rect = link.getBoundingClientRect();
            const preview = createPreview(link);
            document.body.appendChild(preview);

            const previewRect = preview.getBoundingClientRect();
            const top = rect.top - previewRect.height - 10;

            let left = rect.left + (rect.width - previewRect.width) / 2;
            const minLeft = 16;
            const maxLeft = window.innerWidth - previewRect.width - 16;
            left = Math.max(minLeft, Math.min(left, maxLeft));

            Object.assign(preview.style, {
                top: `${top}px`,
                left: `${left}px`,
            });

            requestAnimationFrame(() => {
                preview.style.opacity = '1';
            });

            currentPreview = preview;
        };

        const hidePreview = () => {
            if (currentPreview) {
                currentPreview.style.opacity = '0';
                setTimeout(() => {
                    currentPreview?.remove();
                    currentPreview = null;
                }, 300);
            }
        };

        const handleMouseEnter = (e) => {
            const link = e.target.closest('article a[target="_blank"]');
            if (link) {
                timeout = setTimeout(() => {
                    showPreview(link);
                }, 300);
            }
        };

        const handleMouseLeave = () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            hidePreview();
        };

        document.addEventListener('mouseover', handleMouseEnter);
        document.addEventListener('mouseout', handleMouseLeave);

        return () => {
            document.removeEventListener('mouseover', handleMouseEnter);
            document.removeEventListener('mouseout', handleMouseLeave);
            if (currentPreview) {
                currentPreview.remove();
            }
        };
    }, []);

    return null;
}
