// NeutralPress Service Worker
const SW_VERSION = "1.0.2";
const SW_NAME = `neutralpress-sw-${SW_VERSION}`;

console.log("[SW] Service Worker script loaded", SW_NAME);

// 监听安装事件
self.addEventListener("install", () => {
  console.log("[SW] Installing", SW_NAME);
  self.skipWaiting();
});

// 监听激活事件
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", SW_NAME);
  event.waitUntil(self.clients.claim());
});

// 监听 push 事件
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");

  if (!event.data) {
    console.warn("[SW] Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: notificationData } = data;
    const isTest = notificationData?.isTest || false;

    console.log("[SW] ===== Push Notification Debug =====");
    console.log("[SW] Full data:", data);
    console.log("[SW] notificationData:", notificationData);
    console.log("[SW] isTest:", isTest);
    console.log("[SW] ===================================");

    event.waitUntil(
      (async () => {
        // 检查是否有前台（focused）窗口
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const focusedClient = clients.find((client) => client.focused);

        console.log("[SW] Focused client exists:", !!focusedClient);

        if (focusedClient) {
          console.log("[SW] Found focused client, sending message to client");

          // 有前台窗口，通过 postMessage 发送给客户端
          focusedClient.postMessage({
            type: "PUSH_RECEIVED_WHILE_FOCUSED",
            payload: {
              title,
              body,
              icon,
              badge,
              data: notificationData,
            },
          });

          // 如果是测试通知，即使有前台窗口也显示系统通知
          if (isTest) {
            console.log(
              "[SW] ✓ Test notification detected - will show system notification",
            );
          } else {
            // 非测试通知，有前台窗口时不显示系统通知
            console.log(
              "[SW] ✗ Not a test notification - skipping system notification",
            );
            return;
          }
        } else {
          console.log(
            "[SW] No focused client found, showing system notification",
          );
        }

        // 显示系统通知（测试通知总是显示，或没有前台窗口时显示）
        console.log("[SW] About to show system notification");

        // 检查通知权限
        const permission = await self.registration.permissions
          ?.query({ name: "notifications" })
          .then((result) => result.state)
          .catch(() => Notification.permission);

        console.log("[SW] Notification permission:", permission);

        // 为测试通知使用唯一的 tag，避免被覆盖
        const tag = isTest
          ? `test-${Date.now()}`
          : notificationData?.noticeId || "default";

        const options = {
          body,
          icon: icon || "/icon/192x",
          badge: badge || "/icon/72x",
          data: notificationData,
          tag: tag,
          requireInteraction: isTest, // 测试通知需要用户手动关闭，更容易看到
          vibrate: [200, 100, 200],
          renotify: true, // 即使 tag 相同也重新通知
        };

        console.log("[SW] Notification options:", options);

        const notification = await self.registration.showNotification(
          title,
          options,
        );
        console.log(
          "[SW] System notification shown successfully, notification:",
          notification,
        );

        // 额外验证：获取所有通知
        const notifications = await self.registration.getNotifications();
        console.log(
          "[SW] All active notifications:",
          notifications.length,
          notifications,
        );
      })(),
    );
  } catch (error) {
    console.error("[SW] Failed to handle push event:", error);
  }
});

// 监听通知点击事件
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 尝试聚焦已存在的窗口
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            return client.focus().then(() => client.navigate(url));
          }
        }
        // 否则打开新窗口
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

// 监听来自客户端的消息
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  console.log("[SW] Message received from client:", type);

  if (type === "SHOW_NOTIFICATION") {
    const { title, body, icon, badge, data } = payload;

    const options = {
      body,
      icon: icon || "/icon/192x",
      badge: badge || "/icon/72x",
      data,
      tag: data?.noticeId || "default",
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});
