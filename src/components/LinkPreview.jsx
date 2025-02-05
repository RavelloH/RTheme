'use client';

import { useEffect } from 'react';

const styles = {
    preview: {
        position: 'absolute',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        maxWidth: '400px',
        width: 'calc(100vw - 32px)', // 添加这行，确保在移动设备上有边距
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        fontSize: '14px',
        transition: 'opacity 0.3s ease',
        opacity: 0,
        pointerEvents: 'none',
        color: '#fff',
    },
    header: {
        display: 'flex',
        alignItems: 'center', // 确保垂直居中对齐
        gap: '8px', // 减小间距使布局更紧凑
        marginBottom: '12px',
        lineHeight: '20px', // 与favicon大小保持一致
    },
    title: {
        margin: '0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#fff',
        lineHeight: '20px', // 与favicon大小保持一致
        display: 'flex', // 使用flex布局
        alignItems: 'center', // 确保文字垂直居中
    },
    url: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        marginBottom: '12px',
        wordBreak: 'break-all',
    },
    warning: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    },
};

export default function LinkPreview() {
    useEffect(() => {
        let currentPreview = null;
        let timeout = null;

        const createPreview = (link) => {
            const preview = document.createElement('div');
            preview.className = 'link-preview';
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

            return preview;
        };

        const showPreview = (link) => {
            const rect = link.getBoundingClientRect();
            const preview = createPreview(link);
            document.body.appendChild(preview);

            const previewRect = preview.getBoundingClientRect();
            const top = rect.top - previewRect.height - 10;

            // 修改left计算逻辑，确保不会超出屏幕
            let left = rect.left + (rect.width - previewRect.width) / 2;
            const minLeft = 16; // 左边距
            const maxLeft = window.innerWidth - previewRect.width - 16; // 右边距
            left = Math.max(minLeft, Math.min(left, maxLeft)); // 限制在可视区域内

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
