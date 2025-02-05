'use client';

import { useEffect } from 'react';

const styles = {
    tools: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        fontSize: '12px',
        opacity: 0,
        transition: 'opacity 0.2s ease',
        zIndex: 10,
    },
    lang: {
        padding: '4px 6px',
        borderRadius: '4px',
        background: 'var(--background-color)',
        color: 'var(--secondary-text-color)',
        fontSize: '0.85em',
        userSelect: 'none',
        border: '1px solid var(--border-color)',
    },
    copyBtn: {
        padding: '4px 8px',
        borderRadius: '4px',
        background: 'var(--background-color)',
        border: '1px solid var(--border-color)',
        color: 'var(--secondary-text-color)',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'all 0.2s ease',
        userSelect: 'none',
    },
};

const languageMap = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    bash: 'Shell',
    sh: 'Shell',
    python: 'Python',
    py: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    go: 'Go',
    rust: 'Rust',
    json: 'JSON',
    yaml: 'YAML',
    md: 'Markdown',
};

export default function CodeBlockTools() {
    useEffect(() => {
        const preBlocks = document.querySelectorAll('article pre');

        preBlocks.forEach((pre) => {
            // 设置pre为相对定位
            if (getComputedStyle(pre).position === 'static') {
                pre.style.position = 'relative';
            }

            // 获取代码语言
            const code = pre.querySelector('code');
            const langMatch = code?.className.match(/language-(\w+)/);
            const langKey = langMatch?.[1] || 'text';
            const langName = languageMap[langKey] || langKey;

            // 创建工具栏
            const tools = document.createElement('div');
            Object.assign(tools.style, styles.tools);

            // 创建语言标签
            const lang = document.createElement('span');
            Object.assign(lang.style, styles.lang);
            lang.textContent = langName;

            // 创建复制按钮
            const copyBtn = document.createElement('button');
            Object.assign(copyBtn.style, styles.copyBtn);
            copyBtn.innerHTML = '<span class="i_mini ri-file-copy-line"></span>';

            // 添加复制功能
            copyBtn.onclick = async () => {
                try {
                    const text = code.textContent;
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = '<span class="i_mini ri-check-line"></span>';
                    copyBtn.style.borderColor = 'var(--green-color)';
                    copyBtn.style.color = 'var(--green-color)';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<span class="i_mini ri-file-copy-line"></span>';
                        copyBtn.style.borderColor = 'var(--border-color)';
                        copyBtn.style.color = 'var(--secondary-text-color)';
                    }, 2000);
                } catch (err) {
                    copyBtn.innerHTML = '<span class="i_mini ri-error-warning-line"></span>';
                    copyBtn.style.borderColor = 'var(--red-color)';
                    copyBtn.style.color = 'var(--red-color)';
                }
            };

            // 组装工具栏
            tools.appendChild(lang);
            tools.appendChild(copyBtn);
            pre.appendChild(tools);

            // 添加悬停效果
            pre.onmouseenter = () => (tools.style.opacity = '1');
            pre.onmouseleave = () => (tools.style.opacity = '0');

            // 防止工具栏被选中
            tools.addEventListener('mousedown', (e) => e.preventDefault());
        });

        // 清理函数
        return () => {
            preBlocks.forEach((pre) => {
                const tools = pre.querySelector('div');
                tools?.remove();
            });
        };
    }, []);

    return null;
}
