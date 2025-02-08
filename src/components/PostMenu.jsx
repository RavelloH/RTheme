'use client';

import { useState, useEffect } from 'react';

export default function PostMenu() {
    const [menuItems, setMenuItems] = useState([]);
    const [activeId, setActiveId] = useState('');

    // 生成菜单数据
    function generateMenuData() {
        const titleSet = document.querySelectorAll(
            '#articles-header h2, #articles-body h2, #articles-body h3, #articles-body h4, #articles-body h5, #articles-body h6',
        );

        let counters = { h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
        const items = [];

        titleSet.forEach((element) => {
            const tagName = element.tagName.toLowerCase();
            counters[tagName]++;

            // Reset lower level counters
            if (tagName === 'h2') {
                counters.h3 = counters.h4 = counters.h5 = counters.h6 = 0;
            } else if (tagName === 'h3') {
                counters.h4 = counters.h5 = counters.h6 = 0;
            } else if (tagName === 'h4') {
                counters.h5 = counters.h6 = 0;
            } else if (tagName === 'h5') {
                counters.h6 = 0;
            }

            let numbering = '';
            if (tagName === 'h2') numbering = `${counters.h2}`;
            else if (tagName === 'h3') numbering = `${counters.h2}.${counters.h3}`;
            else if (tagName === 'h4') numbering = `${counters.h2}.${counters.h3}.${counters.h4}`;
            else if (tagName === 'h5')
                numbering = `${counters.h2}.${counters.h3}.${counters.h4}.${counters.h5}`;
            else if (tagName === 'h6')
                numbering = `${counters.h2}.${counters.h3}.${counters.h4}.${counters.h5}.${counters.h6}`;

            items.push({
                id: element.id,
                tagName,
                content: element.innerHTML,
                numbering,
                indent:
                    tagName === 'h3'
                        ? '20px'
                        : tagName === 'h4'
                          ? '40px'
                          : tagName === 'h5'
                            ? '60px'
                            : tagName === 'h6'
                              ? '80px'
                              : '0px',
            });
        });

        return items;
    }

    // 目录高亮
    function highlightMenu() {
        if (cookie.getItem('settingEnableMenuHighlight') == 'false') {
            return false;
        }
        document.querySelectorAll('#articles-menu *.active').forEach((element) => {
            element.classList.remove('active');
        });
        const titleList = document.querySelectorAll(
            '#articles-body h2 , #articles-body h3 , #articles-body h4 , #articles-body h5 , #articles-body h6',
        );
        for (let i = 0; i < titleList.length; i++) {
            let heights = getHeightDifferent(titleList[i]);
            if (heights == 0) {
                document
                    .querySelector(`#articles-menu #${titleList[i].firstChild.id}`)
                    .classList.add('active');
                return titleList[i];
            }
            if (heights > 0) {
                document
                    .querySelector(`#articles-menu #${titleList[i - 1].firstChild.id}`)
                    .classList.add('active');
                return titleList[i - 1];
            }
        }
        return false;
    }

    // 相对高度差
    function getHeightDifferent(element) {
        const rect = element.getBoundingClientRect();
        const vWidth = document.querySelector('#viewmap article').clientWidth;
        const vHeight = document.querySelector('#viewmap article').clientHeight;

        if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
            return rect.top;
        }

        return 0;
    }

    useEffect(() => {
        const items = generateMenuData();
        setMenuItems(items);

        const handleScroll = () => {
            const activeElement = highlightMenu();
            if (activeElement) {
                setActiveId(activeElement.id);
            }
        };

        handleScroll;

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div id='articles-menu'>
            <br />
            <span
                className='t1 center'
                dangerouslySetInnerHTML={{ __html: document.querySelector('h1')?.innerHTML || '' }}
            />
            <hr />
            {menuItems.map((item, index) => (
                <div key={index}>
                    <span
                        className={`${item.tagName} ${activeId === item.id ? 'active' : ''}`}
                        style={{ marginLeft: item.indent }}
                        dangerouslySetInnerHTML={{
                            __html: `${item.numbering} ${item.content}`,
                        }}
                    />
                    <br />
                </div>
            ))}
        </div>
    );
}
