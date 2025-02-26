'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import './message.css';
import token from '@/utils/token';
import { useSearchParams, useRouter } from 'next/navigation';

// 定义消息最大字数
const MAX_MESSAGE_LENGTH = 300;

// 创建一个加载状态组件
function LoadingFallback() {
  return (
    <div className="message-container">
      <div className="empty-state" style={{height: '100%'}}>
        <div>加载消息中...</div>
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}

// 将主要内容移到MessageContent组件中
function MessageContent() {
  // 所有原来的状态和逻辑保持不变
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // 添加对话相关状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // 新增一个标志区分手动加载和自动轮询
  const [isPolling, setIsPolling] = useState(false);

  // 添加移动设备视图状态 - 列表视图或聊天视图
  const [mobileView, setMobileView] = useState('list'); // 'list' 或 'chat'
  // 添加状态跟踪是否为移动设备
  const [isMobile, setIsMobile] = useState(false);
  
  // 检测设备是否为移动设备的函数 - 修改为安全的客户端检测
  const checkIfMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false; // 默认返回桌面视图
  };

  // 初始化检测设备类型 - 修改逻辑，确保移动端至少有一个视图可见
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768;
      }
      return false;
    };
    
    // 设置初始移动设备状态
    setIsMobile(checkMobile());
    
    // 如果URL中有uid参数，且是移动设备，则切换到聊天视图，否则默认显示列表视图
    const uid = searchParams.get('uid');
    if (uid && checkMobile()) {
      setMobileView('chat');
    } else {
      setMobileView('list');
    }
    
    // 添加窗口大小变化监听器
    const handleResize = () => {
      const mobile = checkMobile();
      setIsMobile(mobile);
      
      // 如果从小屏幕变大，确保总是显示两栏布局
      if (!mobile) {
        // 不修改mobileView，在桌面视图时这个值没有影响
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [searchParams]);

  // 加载用户列表
  const loadUserList = async (silent = false) => {
    try {
        // 仅在非静默模式下显示加载状态
        if (!silent) {
            setLoadingUsers(true);
        }

        const response = await fetch('/api/message/list', {
            headers: {
                Authorization: `Bearer ${token.get()}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '加载用户列表失败');
        }

        const data = await response.json();
        setUsers(data.users || []);

        if (!silent) {
            setError(null);
        }
    } catch (err) {
        if (!silent) {
            setError(err.message);
            console.error('加载用户列表失败:', err);
        }
    } finally {
        if (!silent) {
            setLoadingUsers(false);
        }
    }
  };

  // 加载对话消息 - 修改加载方法，添加静默刷新功能
  const loadConversation = async (uid, silent = false) => {
    if (!uid) return;

    try {
        // 仅在非静默模式下显示加载状态
        if (!silent) {
            setLoading(true);
        }

        const response = await fetch(`/api/message/conversation?uid=${uid}`, {
            headers: {
                Authorization: `Bearer ${token.get()}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '加载对话失败');
        }

        const data = await response.json();
        // 检查是否有新消息
        const currentMessageCount = messages.length;
        const newMessages = data.messages || [];

        // 更新消息列表
        setMessages(newMessages);

        // 仅在非静默模式下才清除错误
        if (!silent) {
            setError(null);
        }

        // 如果是静默更新并且有新消息，滚动到底部
        if (silent && newMessages.length > currentMessageCount) {
            setTimeout(() => scrollToBottom(), 100);
        }
    } catch (err) {
        // 仅在非静默模式下显示错误
        if (!silent) {
            setError(err.message);
            console.error('加载对话失败:', err);
        }
    } finally {
        // 仅在非静默模式下重置加载状态
        if (!silent) {
            setLoading(false);
        }
    }
  };

  // 发送消息
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    // 检查字数是否超过限制
    if (newMessage.length > MAX_MESSAGE_LENGTH) {
        setError(`消息长度超出限制，最大${MAX_MESSAGE_LENGTH}字符`);
        return;
    }

    try {
        setLoading(true);
        const formData = new URLSearchParams();
        formData.append('targetUid', selectedUser.uid);
        formData.append('content', newMessage);

        const response = await fetch('/api/message/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.get()}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '发送消息失败');
        }

        // 重新加载对话
        await loadConversation(selectedUser.uid);
        setNewMessage('');
        setError(null);
    } catch (err) {
        setError(err.message);
        console.error('发送消息失败:', err);
    } finally {
        setLoading(false);
    }
  };

  // 限制输入字数
  const handleMessageChange = (e) => {
    const value = e.target.value;
    // 直接限制输入长度不超过最大限制
    if (value.length <= MAX_MESSAGE_LENGTH) {
        setNewMessage(value);
        adjustTextareaHeight(e.target);
    }
  };

  // 搜索用户
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
    }

    try {
        setSearching(true);
        const response = await fetch(
            `/api/user/search?query=${encodeURIComponent(searchQuery)}`,
            {
                headers: {
                    Authorization: `Bearer ${token.get()}`,
                },
            },
        );
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '搜索用户失败');
        }
        const data = await response.json();
        setSearchResults(data.users || []);
        setError(null);
    } catch (err) {
        setError(err.message);
        console.error('搜索用户失败:', err);
    } finally {
        setSearching(false);
    }
  };

  // 选择用户进行对话
  const selectUser = (user) => {
    setSelectedUser(user);
    // 无论如何都刷新对话，不使用静默模式以显示加载状态
    loadConversation(user.uid, false);
    // 更新URL参数，不刷新页面
    router.push(`/message?uid=${user.uid}`, { scroll: false });
    // 如果是从搜索结果选择的，关闭对话框
    setShowAddDialog(false);
    
    // 在移动设备上，切换到聊天视图
    if (isMobile) {
      setMobileView('chat');
    }
  };

  // 返回到列表视图的处理函数
  const handleBackToList = () => {
    setMobileView('list');
    // 可选：清除URL中的uid参数
    router.push('/message', { scroll: false });
  };

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 处理URL参数中的uid
  const loadUserFromParams = async () => {
    const uidParam = searchParams.get('uid');
    if (uidParam && !selectedUser) {
        const uid = parseInt(uidParam, 10);
        if (!isNaN(uid)) {
            // 检查这个用户是否已经在我们的对话列表中
            const existingUser = users.find((u) => u.uid === uid);
            if (existingUser) {
                selectUser(existingUser);
            } else {
                // 如果不在列表中，需要获取这个用户的信息
                try {
                    const response = await fetch(`/api/user/search?query=${uid}`, {
                        headers: {
                            Authorization: `Bearer ${token.get()}`,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.users && data.users.length > 0) {
                            selectUser(data.users[0]);
                        }
                    }
                } catch (error) {
                    console.error('获取用户信息失败:', error);
                }
            }
        }
    }
  };

  // 定义一个异步的轮询函数
  const pollData = async () => {
    if (isPolling) return; // 防止重复轮询
      
    try {
      setIsPolling(true);
          
      // 首先更新用户列表
      await loadUserList(true);
          
      // 然后如果有选中的用户，更新对话内容
      if (selectedUser) {
        await loadConversation(selectedUser.uid, true);
      }
    } catch (err) {
      console.error("轮询更新失败:", err);
    } finally {
      setIsPolling(false);
    }
  };

  // 初始加载用户列表
  useEffect(() => {
    const loadInitialView = async () => {
      await loadUserList(false);
      const uid = searchParams.get('uid');
      
      // 如果URL中有uid，且是移动设备，则切换到聊天视图
      if (uid && isMobile) {
        setMobileView('chat');
      }
      
      loadUserFromParams();
    };
    
    loadInitialView();
    // 设置轮询
    const interval = setInterval(pollData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // 监听URL参数变化
  useEffect(() => {
    loadUserFromParams();
  }, [searchParams, users]);

  // 消息更新后滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 搜索结果更新
  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  // 当选择新用户时加载对话 - 添加这个效果
  useEffect(() => {
    if (selectedUser && !isPolling) {
        loadConversation(selectedUser.uid);
    }
  }, [selectedUser]);

  // 添加对当前选中用户的监听，确保用户列表更新后刷新当前对话内容
  useEffect(() => {
    // 如果users数组更新了且有选中的用户，检查这个用户是否还在列表中
    if (users.length > 0 && selectedUser) {
        const userStillExists = users.find((u) => u.uid === selectedUser.uid);

        // 如果用户还在列表中，刷新对话内容
        if (userStillExists && !isPolling) {
            loadConversation(selectedUser.uid, true);
        }
    }
  }, [users, selectedUser]);

  // 格式化时间
  const formatTime = (dateString) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // 同一天，显示时:分
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
        // 一周内，显示星期几+时:分
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${days[messageDate.getDay()]} ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        // 超过一周，显示年-月-日 时:分
        return `${messageDate.toLocaleDateString()} ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  // 自动调整文本域高度
  const adjustTextareaHeight = (element) => {
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight > 120 ? 120 : element.scrollHeight) + 'px';
  };

  // 聚焦输入框
  useEffect(() => {
    if (selectedUser && inputRef.current) {
        inputRef.current.focus();
    }
  }, [selectedUser]);

  return (
    <div className="message-container">
      {/* 对话列表区域 - 只在桌面或是移动设备列表视图时显示 */}
      <div className={`user-list ${isMobile && mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        <div className="user-list-header">
          <h2>对话列表</h2>
          <button className="add-conversation-btn" onClick={() => setShowAddDialog(true)} title="添加新对话">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {loadingUsers ? (
              <div className='empty-state'>
                  <div>加载对话列表...</div>
                  <div className='loading-spinner'></div>
              </div>
          ) : users.length === 0 ? (
              <div className='empty-state'>
                  <svg
                      width='48'
                      height='48'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                  >
                      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
                  </svg>
                  <p>暂无对话</p>
                  <button
                      className='add-conversation-btn'
                      onClick={() => setShowAddDialog(true)}
                      style={{ marginTop: '15px' }}
                  >
                      <svg
                          width='20'
                          height='20'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                      >
                          <line x1='12' y1='5' x2='12' y2='19'></line>
                          <line x1='5' y1='12' x2='19' y2='12'></line>
                      </svg>
                  </button>
              </div>
          ) : (
              users.map((user) => (
                  <div
                      key={user.uid}
                      className={`user-item ${selectedUser && selectedUser.uid === user.uid ? 'active' : ''}`}
                      onClick={() => selectUser(user)}
                  >
                      <div className='user-avatar'>
                          {user.avatar ? (
                              <img src={user.avatar} alt={user.nickname} />
                          ) : (
                              user.nickname.charAt(0)
                          )}
                      </div>
                      <div className='user-info'>
                          <div className='user-name'>{user.nickname}</div>
                          <div className='user-username'>@{user.username}</div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* 聊天区域 - 只在桌面或是移动设备聊天视图时显示 */}
      <div className={`chat-area ${isMobile && mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        {selectedUser ? (
          <>
            <div className="chat-header">
              {/* 在移动设备上添加返回按钮 */}
              {isMobile && (
                <button 
                  className="back-button" 
                  onClick={handleBackToList}
                  aria-label="返回列表"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
              )}
              
              <div className="user-avatar" style={{ width: '32px', height: '32px', marginRight: '10px' }}>
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.nickname} />
                ) : (
                  selectedUser.nickname.charAt(0)
                )}
              </div>
              <div>
                <div>{selectedUser.nickname}</div>
                <div className="user-username" style={{fontSize: '12px'}}>@{selectedUser.username}</div>
              </div>
            </div>
            
            <div className='messages-container'>
                      {loading && messages.length === 0 ? (
                          <div className='empty-state'>
                              <div>加载消息中...</div>
                              <div className='loading-spinner'></div>
                          </div>
                      ) : messages.length === 0 ? (
                          <div className='empty-state'>
                              <svg
                                  width='48'
                                  height='48'
                                  viewBox='0 0 24 24'
                                  fill='none'
                                  stroke='currentColor'
                                  strokeWidth='1.5'
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                              >
                                  <circle cx='12' cy='12' r='10'></circle>
                                  <line x1='12' y1='8' x2='12' y2='12'></line>
                                  <line x1='12' y1='16' x2='12.01' y2='16'></line>
                              </svg>
                              <p>暂无消息记录，开始对话吧！</p>
                          </div>
                      ) : (
                          messages.map((msg) => (
                              <div
                                  key={msg.id}
                                  className={`message-bubble ${msg.isMine ? 'mine' : 'other'}`}
                              >
                                  {msg.content}
                                  <div className='message-time'>
                                      {formatTime(msg.createdAt)}
                                  </div>
                              </div>
                          ))
                      )}
                      <div ref={messagesEndRef} />
                  </div>
                  <form className='input-area' onSubmit={sendMessage}>
                      <div className='input-wrapper'>
                          <textarea
                              ref={inputRef}
                              className='message-input'
                              value={newMessage}
                              onChange={handleMessageChange}
                              placeholder='输入消息...'
                              disabled={loading}
                              onKeyDown={(e) => {
                                  // 按Ctrl+Enter或Cmd+Enter发送消息
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      sendMessage(e);
                                  }
                              }}
                          />
                          <div
                              className={`char-counter ${newMessage.length >= MAX_MESSAGE_LENGTH * 0.9 ? 'warning' : ''}`}
                          >
                              {newMessage.length}/{MAX_MESSAGE_LENGTH}
                          </div>
                      </div>
                      <button
                          type='submit'
                          className='send-button'
                          disabled={
                              !newMessage.trim() ||
                              loading ||
                              newMessage.length > MAX_MESSAGE_LENGTH
                          }
                      >
                          {loading ? '发送中...' : '发送'}
                      </button>
                  </form>
          </>
        ) : (
          <div className="no-conversation">
            {/* 在移动设备时添加返回按钮 */}
            {isMobile && mobileView === 'chat' && (
              <button 
                className="back-button-empty" 
                onClick={handleBackToList}
                aria-label="返回列表"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                返回对话列表
              </button>
            )}
            
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>选择一个联系人开始对话</p>
          </div>
        )}
        
        {error && (
              <div className='error-message'>
                  <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                  >
                      <circle cx='12' cy='12' r='10'></circle>
                      <line x1='12' y1='8' x2='12' y2='12'></line>
                      <line x1='12' y1='16' x2='12.01' y2='16'></line>
                  </svg>
                  {error}
              </div>
          )}
      </div>
      
      {/* 添加对话弹窗 */}
      {showAddDialog && (
          <div className='dialog-overlay' onClick={() => setShowAddDialog(false)}>
              <div className='dialog-content' onClick={(e) => e.stopPropagation()}>
                  <div className='dialog-header'>
                      <h3>添加新对话</h3>
                      <button
                          className='close-button'
                          onClick={() => setShowAddDialog(false)}
                      >
                          <svg
                              width='18'
                              height='18'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                          >
                              <line x1='18' y1='6' x2='6' y2='18'></line>
                              <line x1='6' y1='6' x2='18' y2='18'></line>
                          </svg>
                      </button>
                  </div>
                  <div className='dialog-body'>
                      <div className='search-container'>
                          <input
                              type='text'
                              className='search-input'
                              placeholder='输入用户ID、用户名或昵称搜索'
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              autoFocus
                          />
                      </div>
                      <div className='search-results'>
                          {searching ? (
                              <div className='search-loading'>
                                  <div
                                      className='loading-spinner'
                                      style={{ margin: '0 auto 15px' }}
                                  ></div>
                                  <div>搜索中...</div>
                              </div>
                          ) : searchResults.length > 0 ? (
                              searchResults.map((user) => (
                                  <div
                                      key={user.uid}
                                      className='user-item'
                                      onClick={() => selectUser(user)}
                                  >
                                      <div className='user-avatar'>
                                          {user.avatar ? (
                                              <img src={user.avatar} alt={user.nickname} />
                                          ) : (
                                              user.nickname.charAt(0)
                                          )}
                                      </div>
                                      <div className='user-info'>
                                          <div className='user-name'>{user.nickname}</div>
                                          <div className='user-username'>
                                              @{user.username} (ID: {user.uid})
                                          </div>
                                      </div>
                                  </div>
                              ))
                          ) : searchQuery ? (
                              <div className='no-results'>
                                  <svg
                                      width='40'
                                      height='40'
                                      viewBox='0 0 24 24'
                                      fill='none'
                                      stroke='currentColor'
                                      strokeWidth='1.5'
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      style={{
                                          margin: '0 auto 15px',
                                          display: 'block',
                                          color: '#999',
                                      }}
                                  >
                                      <circle cx='11' cy='11' r='8'></circle>
                                      <line x1='21' y1='21' x2='16.65' y2='16.65'></line>
                                  </svg>
                                  没有找到匹配的用户
                              </div>
                          ) : (
                              <div className='search-tip'>
                                  <svg
                                      width='40'
                                      height='40'
                                      viewBox='0 0 24 24'
                                      fill='none'
                                      stroke='currentColor'
                                      strokeWidth='1.5'
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      style={{
                                          margin: '0 auto 15px',
                                          display: 'block',
                                          color: '#999',
                                      }}
                                  >
                                      <circle cx='11' cy='11' r='8'></circle>
                                      <line x1='21' y1='21' x2='16.65' y2='16.65'></line>
                                  </svg>
                                  输入关键词开始搜索用户
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// 主组件用Suspense包裹MessageContent
export default function Message() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MessageContent />
    </Suspense>
  );
}
