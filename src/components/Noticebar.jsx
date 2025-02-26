'use client';
import { useState, useEffect, useRef } from 'react';
import '@/assets/css/Noticebar.css';
import notice from '@/utils/notice';
import token from '@/utils/token';
import log from '@/utils/log';
import { subscribe, unsubscribe } from '@/utils/log';
import message from '@/utils/message';
import loadURL from '@/utils/loadURL';
import { useBroadcast } from '@/store/useBroadcast';

export default function Noticebar() {
    const [unreadNotices, setUnreadNotices] = useState([]);
    const [readNotices, setReadNotices] = useState([]);
    const [hasNewNotices, setHasNewNotices] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [logData, setLogData] = useState([]);
    const [isLoadSuccess, setLoadSuccess] = useState(false);
    const [isNoticeBarOpen, setNoticeBarOpen] = useState(false);
    const rightDivRef = useRef(null);

    const registerBroadcast = useBroadcast((state) => state.registerCallback);
    const unregisterBroadcast = useBroadcast((state) => state.unregisterCallback);
    const broadcast = useBroadcast((state) => state.broadcast);

    // 读写本地缓存
    const loadCachedNotices = () => {
        try {
            const data = JSON.parse(localStorage.getItem('noticeCache') || '{}');
            return {
                latest: data.latest || 0,
                unread: data.unread || [],
                read: data.read || [],
            };
        } catch {
            return { latest: 0, unread: [], read: [] };
        }
    };
    const saveCachedNotices = (latest, unread, read) => {
        log.info('Saving cached notices');
        localStorage.setItem('noticeCache', JSON.stringify({ latest, unread, read }));
    };

    // 新增：规范化URL函数，确保可以正确比较
    const normalizeUrl = (url) => {
        if (!url) return '';

        // 如果是相对路径，转换为绝对路径
        let fullUrl = url;
        if (url.startsWith('/')) {
            const baseUrl = window.location.origin;
            fullUrl = `${baseUrl}${url}`;
        } else if (!url.startsWith('http')) {
            const baseUrl = window.location.origin + window.location.pathname;
            fullUrl = `${baseUrl}/${url}`;
        }

        try {
            // 创建URL对象以规范化路径
            const urlObj = new URL(fullUrl);
            return urlObj.toString();
        } catch (e) {
            log.error(`Failed to normalize URL: ${url}, ${e.message}`);
            return url;
        }
    };

    // 新增：检查两个URL是否匹配
    const urlsMatch = (noticeUrl, currentUrl) => {
        if (!noticeUrl) return false;

        try {
            // 规范化两个URL
            const normalizedNoticeUrl = normalizeUrl(noticeUrl);
            const normalizedCurrentUrl = normalizeUrl(currentUrl);

            log.info(`Comparing URLs: ${normalizedNoticeUrl} vs ${normalizedCurrentUrl}`);

            // 完全匹配
            if (normalizedNoticeUrl === normalizedCurrentUrl) {
                log.info('URLs match exactly');
                return true;
            }

            // 尝试解析URL对象进行更精确的比较
            const noticeUrlObj = new URL(normalizedNoticeUrl);
            const currentUrlObj = new URL(normalizedCurrentUrl);

            // 比较路径和查询参数（忽略hash）
            if (
                noticeUrlObj.pathname === currentUrlObj.pathname &&
                noticeUrlObj.search === currentUrlObj.search
            ) {
                log.info('URLs match (pathname and search params)');
                return true;
            }

            // 处理可能的相对路径差异
            const noticePathAndQuery = noticeUrlObj.pathname + noticeUrlObj.search;
            const currentPathAndQuery = currentUrlObj.pathname + currentUrlObj.search;

            if (noticePathAndQuery === currentPathAndQuery) {
                log.info('URLs match (path and query)');
                return true;
            }

            return false;
        } catch (e) {
            log.error(`Error comparing URLs: ${noticeUrl} vs ${currentUrl}, ${e.message}`);
            return false;
        }
    };

    // 获取新通知
    const fetchNotices = async () => {
        log.info('Fetching notices');
        const cacheData = loadCachedNotices();
        try {
            const res = await fetch(`/api/notice/check?latest=${cacheData.latest}`, {
                headers: { Authorization: `Bearer ${token.get()}` },
            });

            if (res.status === 401) {
                log.info('Unauthorized access detected');
                localStorage.clear();
                setIsLoggedIn(false);
                return;
            }

            if (!res.ok) {
                log.info(`Failed to fetch notices: ${res.statusText}`);
                return;
            }
            const newData = await res.json();
            setLoadSuccess(true);
            log.info('Notices fetched successfully');
            if (newData.notices?.length) {
                log.info(`${newData.notices.length} new notices received`);
                const newTime = newData.latest || cacheData.latest;
                const mergedUnread = [...cacheData.unread, ...newData.notices];
                const locallyReadIds = cacheData.read.map((n) => n.id);
                const serverUnreadIds = newData.notices.map((n) => n.id);
                const needMarkRead = locallyReadIds.filter((id) => serverUnreadIds.includes(id));

                // 获取当前完整URL，包括查询参数
                const currentFullUrl = window.location.href;
                log.info(`Current URL: ${currentFullUrl}`);

                // 检查是否有通知链接与当前URL匹配
                const autoReadNotices = newData.notices.filter(
                    (n) => !n.isRead && n.href && urlsMatch(n.href, currentFullUrl),
                );

                // 将匹配当前URL的通知标记为已读
                if (autoReadNotices.length > 0) {
                    const autoReadIds = autoReadNotices.map((n) => n.id);
                    log.info(
                        `Auto marking ${autoReadIds.length} notices as read because they match current URL: ${currentFullUrl}`,
                    );

                    autoReadNotices.forEach((n) => {
                        log.info(`Auto-read notice href: ${n.href}`);
                    });

                    await fetch('/api/notice/read', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token.get()}`,
                        },
                        body: JSON.stringify(autoReadIds),
                    });

                    // 在新数据中更新这些通知为已读
                    newData.notices.forEach((n) => {
                        if (autoReadIds.includes(n.id)) {
                            n.isRead = true;
                        }
                    });
                }

                if (needMarkRead.length > 0) {
                    await fetch('/api/notice/read', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token.get()}`,
                        },
                        body: JSON.stringify(needMarkRead),
                    });
                }
                const newNotices = newData.notices;
                const updatedUnread = cacheData.unread.filter(
                    (n) => !newNotices.find((m) => m.id === n.id),
                );
                const updatedRead = cacheData.read.filter(
                    (n) => !newNotices.find((m) => m.id === n.id),
                );

                newNotices.forEach((noticeItem) => {
                    if (noticeItem.isRead) {
                        updatedRead.push(noticeItem);
                    } else {
                        updatedUnread.push(noticeItem);
                    }
                });

                // 对已读和未读通知进行降序排序
                updatedUnread.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                updatedRead.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                saveCachedNotices(newTime, updatedUnread, updatedRead);
                setUnreadNotices(updatedUnread);
                setReadNotices(updatedRead);

                // 过滤出真正需要提示的新通知（排除自动标记为已读的通知）
                const newUniqueNotices = newNotices.filter(
                    (n) =>
                        !cacheData.unread.some((unread) => unread.id === n.id) &&
                        !cacheData.read.some((read) => read.id === n.id) &&
                        n.isRead === false &&
                        !(n.href && urlsMatch(n.href, currentFullUrl)),
                );

                setHasNewNotices(newUniqueNotices.length > 0);

                // 只对不匹配当前路径的通知显示提示
                if (newUniqueNotices.length > 0) {
                    notice.send('收到一则新通知', newUniqueNotices[0].content, '/icon/512x');
                    message.success('收到一则新通知', 10000);
                }
            } else {
                log.info('No new notices received');
                setUnreadNotices(cacheData.unread);
                setReadNotices(cacheData.read);
            }
        } catch (error) {
            log.error(`Error fetching notices: ${error.message}`);
        }
    };

    // 用于单条已读时先请求后跳转
    const markAsReadOnServer = async (noticeId) => {
        try {
            await fetch('/api/notice/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token.get()}`,
                },
                body: JSON.stringify([noticeId]),
            });
        } catch {
            log.error('Failed to mark notice as read on server');
        }
    };

    // 将某通知设为已读
    const markAsRead = async (e, notice) => {
        broadcast({
            action: 'closeNoticebar',
        });
        e.preventDefault(); // 阻止默认导航
        log.info(`Marking notice as read: ${notice.id}`);
        message.add(
            <a>
                <div>正在标记通知为已读</div>
            </a>,
            30000,
        );
        await markAsReadOnServer(notice.id);
        const cacheData = loadCachedNotices();
        const updatedUnread = cacheData.unread.filter((n) => n.id !== notice.id);
        const updatedRead = [...cacheData.read, notice];
        saveCachedNotices(cacheData.latest, updatedUnread, updatedRead);
        setUnreadNotices(updatedUnread);
        setReadNotices(updatedRead);
        log.info(`Notice marked as read: ${notice.id}`);
        loadURL(notice.href); // 手动导航
    };

    // 新增“已读全部”功能
    const markAllAsRead = async () => {
        const unreadIds = unreadNotices.map((n) => n.id);
        if (unreadIds.length > 0) {
            await fetch('/api/notice/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token.get()}`,
                },
                body: JSON.stringify(unreadIds),
            });
            const cacheData = loadCachedNotices();
            const updatedRead = [...cacheData.read, ...unreadNotices];
            saveCachedNotices(cacheData.latest, [], updatedRead);
            setUnreadNotices([]);
            setReadNotices(updatedRead);
        }
    };

    useEffect(() => {
        // 确保在客户端执行的逻辑
        if (token.get()) {
            setIsLoggedIn(true);
        } else {
            localStorage.removeItem('noticeCache');
        }
        setLogData(log.data);

        if (isLoggedIn) {
            fetchNotices();
            const interval = setInterval(fetchNotices, 60_000);
            return () => {
                clearInterval(interval);
            };
        }
    }, [isLoggedIn, token.get()]);

    useEffect(() => {
        if (hasNewNotices) {
            log.info('New notices detected');
            const ripple = document.querySelector('.ripple');
            if (ripple && ripple.classList.contains('active')) {
                ripple.classList.remove('active');
                void ripple.offsetWidth;
                ripple.classList.add('active');
            } else if (ripple) {
                ripple.classList.add('active');
            }
            const iconNotice = document.querySelector('#icon-notice');
            const iconNoticeSpan = document.querySelector('#icon-notice-span');
            if (iconNotice) iconNotice.classList.add('highlight');
            if (iconNoticeSpan) iconNoticeSpan.classList.add('breathI');
        }
    }, [hasNewNotices]);

    useEffect(() => {
        const handleLogChange = () => {
            setLogData([...log.data]);
        };

        subscribe(handleLogChange);
        return () => {
            unsubscribe(handleLogChange);
        };
    }, []);

    useEffect(() => {
        // 自动滚动到行尾
        if (rightDivRef.current) {
            rightDivRef.current.scrollTop = rightDivRef.current.scrollHeight;
        }
    }, [logData]);

    useEffect(() => {
        const handleNoticebar = (message) => {
            if (
                (message.action == 'toggleNoticebar' && !isNoticeBarOpen) ||
                message.action === 'openNoticebar'
            ) {
                setNoticeBarOpen(true);
                document.querySelector('#noticebar').classList.add('active');
                document.querySelector('#shade-global').classList.add('active');
            }
            if (
                (message.action == 'toggleNoticebar' && isNoticeBarOpen) ||
                message.action === 'closeNoticebar'
            ) {
                setTimeout(() => setNoticeBarOpen(false), 500);
                document.querySelector('#noticebar').classList.remove('active');
                document.querySelector('#shade-global').classList.remove('active');
            }
        };
        registerBroadcast(handleNoticebar);
        return () => {
            unregisterBroadcast();
        };
    }, [registerBroadcast, unregisterBroadcast]);

    return (
        <section id='noticebar'>
            <div id='noticebar-context'>
                <div id='noticebar-left'>
                    <h2>通知中心</h2>
                    <b>
                        总计{unreadNotices.length + readNotices.length}条通知，
                        {unreadNotices.length}条未读通知
                    </b>
                    <hr />
                    {!isLoggedIn ? (
                        <div className='center'>当前未登录，无法查看通知</div>
                    ) : (
                        <>
                            {unreadNotices.length === 0 ? (
                                <div className='center'>
                                    {isLoadSuccess ? '当前无未读通知' : '正在向服务器请求通知列表'}
                                    <br />
                                    <br />
                                </div>
                            ) : (
                                <>
                                    {unreadNotices.map((notice, index) => (
                                        <div
                                            key={index}
                                            className='notice-div'
                                            style={{
                                                marginBottom: '1rem',
                                                borderBottom: '1px dashed rgba(255,255,255,0.2)',
                                                paddingBottom: '0.5rem',
                                            }}
                                        >
                                            <a
                                                href={notice.href}
                                                style={{
                                                    color: '#fff',
                                                    textDecoration: 'none',
                                                }}
                                                onClick={(e) => markAsRead(e, notice)}
                                            >
                                                {notice.content}
                                            </a>
                                            <div
                                                style={{
                                                    fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                {new Date(notice.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                    <br />
                    <br />
                    <div
                        className='center full'
                        style={{
                            opacity: 0.25,
                        }}
                    >
                        - <i>Mind stuff, that&apos;s what they say when the verses fly</i> -
                    </div>
                    {readNotices.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <br />
                            <br />
                            <h4>已读通知</h4>
                            <br />
                            {readNotices.map((notice, index) => (
                                <div
                                    key={index}
                                    className='notice-div'
                                    style={{
                                        marginBottom: '1rem',
                                        borderBottom: '1px dashed rgba(255,255,255,0.2)',
                                        paddingBottom: '0.5rem',
                                    }}
                                >
                                    <a
                                        href={notice.href}
                                        onClick={() => broadcast({ action: 'closeNoticebar' })}
                                        style={{
                                            color: '#ccc',
                                            textDecoration: 'none',
                                        }}
                                        className='no-effect'
                                    >
                                        {notice.content}
                                    </a>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'rgba(200,200,200,0.5)',
                                            marginTop: '0.25rem',
                                        }}
                                    >
                                        {new Date(notice.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div id='noticebar-right' ref={rightDivRef}>
                    {isNoticeBarOpen
                        ? logData.map((item, index) => (
                              <>
                                  <span key={index}>
                                      {`[${new Date(
                                          item.time,
                                      ).toLocaleString()}][${item.level.toUpperCase()}] ${
                                          item.content
                                      }`}
                                  </span>
                                  <br />
                              </>
                          ))
                        : null}
                </div>
            </div>
            <div id='noticebar-footer' onClick={() => broadcast({ action: 'closeNoticebar' })}>
                <span className='i ri-arrow-up-s-line'></span>
            </div>
        </section>
    );
}
