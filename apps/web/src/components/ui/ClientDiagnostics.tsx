"use client";

import { useEffect, useState } from "react";

interface ClientDiagnosticsProps {
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
}

interface NavigatorConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface DiagnosticsInfo {
  errorType: string;
  errorMessage: string;
  errorTimestamp: string;
  errorTimestampUTC: string;
  errorEpoch: number;
  timezone: string;
  nextData?: { buildId: string; page: string };
  currentUrl: string;
  currentPath: string;
  currentSearch: string;
  currentHash: string;
  origin: string;
  protocol: string;
  hostname: string;
  port: string;
  isIframe: boolean;
  historyLength: number;
  hasOpener: boolean;
  referrer: string;
  referrerDomain: string;
  userAgent: string;
  browserLanguage: string;
  browserLanguages: readonly string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  prefersColorScheme: string;
  prefersReducedMotion: boolean;
  prefersContrast: string;
  webdriver: boolean;
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  screenPixelDepth: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  visualViewport?: {
    width: number;
    height: number;
    scale: number;
    offsetTop: number;
    offsetLeft: number;
  };
  connectionType?: string;
  connectionDownlink?: number;
  connectionRtt?: number;
  connectionSaveData?: boolean;
  online: boolean;
  crossOriginIsolated: boolean;
  performanceTiming?: {
    navigationStart: number;
    redirectStart: number;
    redirectEnd: number;
    fetchStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    secureConnectionStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domLoading: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
  };
  navigation?: {
    type: string;
    redirectCount: number;
    loadTime: number;
    domLoadTime: number;
    totalTime: number;
    domInteractiveTime: number;
    firstByteTime: number;
  };
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    memoryUsage: string;
  };
  webVitals?: {
    fcp?: number;
  };
  pageStayTime: number;
  resourceStats: {
    total: number;
    slow: number;
    slowest?: string;
  };
  longTaskCount: number;
  webApis?: {
    serviceWorker: boolean;
    webWorkers: boolean;
    webRTC: boolean;
    webGL: boolean;
    webGL2: boolean;
    webSocket: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    geolocation: boolean;
    notifications: boolean;
    pushManager: boolean;
    permissions: boolean;
    credentials: boolean;
    paymentRequest: boolean;
    webAssembly: boolean;
    sharedWorkers: boolean;
    cryptoSubtle: boolean;
    clipboard: boolean;
    swStatus: string;
  };
  jsEngine?: {
    async: boolean;
    promises: boolean;
    asyncAwait: boolean;
    generators: boolean;
    bigInt: boolean;
    symbols: boolean;
    proxies: boolean;
    weakMap: boolean;
    weakSet: boolean;
    typedArrays: boolean;
    dataView: boolean;
  };
  cssFeatures?: {
    flexbox: boolean;
    grid: boolean;
    variables: boolean;
    backdropFilter: boolean;
    webkitBackdropFilter: boolean;
    sticky: boolean;
    objectFit: boolean;
    clipPath: boolean;
    maskImage: boolean;
    scrollSnap: boolean;
    containerQueries: boolean;
  };
  errorStack?: string;
  sessionStorage: {
    length: number;
    keys: readonly string[];
    keyNames: string;
  };
  localStorage: {
    length: number;
    keys: readonly string[];
    keyNames: string;
  };
  storageQuota?: {
    usage: number;
    quota: number;
  };
  cookies: {
    enabled: boolean;
    count: number;
    size: number;
    names: string;
  };
  document: {
    title: string;
    readyState: string;
    visibilityState: string;
    hasFocus: boolean;
    characterSet: string;
    contentType: string;
    compatMode: string;
    lastModified: string;
    domain: string;
    URL: string;
    domNodeCount: number;
    scriptsCount: number;
    styleSheetsCount: number;
    fontsStatus: string;
    fontsCount: number;
    activeElement: string;
  };
}

export default function ClientDiagnostics({
  errorType = "Unknown Error",
  errorMessage = "An error occurred",
  errorStack,
}: ClientDiagnosticsProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const collectErrorInfo = async () => {
      // Capture console errors during diagnostics collection
      const consoleErrors: string[] = [];
      const originalError = console.error;
      console.error = function (...args) {
        consoleErrors.push(args.join(" "));
        originalError.apply(console, args);
      };

      try {
        const now = new Date();
        const connection = (
          navigator as Navigator & { connection?: NavigatorConnection }
        ).connection;
        const perfMemory = (
          performance as Performance & { memory?: PerformanceMemory }
        ).memory;

        // Iframe detection (cross-origin iframe access throws)
        let isIframe = false;
        try {
          isIframe = window.top !== window.self;
        } catch {
          isIframe = true;
        }

        // Service Worker status
        let swStatus = "unsupported";
        if ("serviceWorker" in navigator) {
          swStatus = navigator.serviceWorker.controller
            ? navigator.serviceWorker.controller.state
            : "no-controller";
        }

        // Storage quota (async)
        let storageQuota: { usage: number; quota: number } | undefined;
        if (navigator.storage?.estimate) {
          try {
            const est = await navigator.storage.estimate();
            storageQuota = {
              usage: est.usage ?? 0,
              quota: est.quota ?? 0,
            };
          } catch {
            // Not available in this context
          }
        }

        // Web Vitals - FCP
        const paintEntries = performance.getEntriesByType?.("paint") ?? [];
        const fcpEntry = paintEntries.find(
          (e) => e.name === "first-contentful-paint",
        );

        // User preferences
        const prefersColorScheme = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches
          ? "dark"
          : window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "no-preference";
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const prefersContrast = window.matchMedia("(prefers-contrast: high)")
          .matches
          ? "high"
          : window.matchMedia("(prefers-contrast: low)").matches
            ? "low"
            : "no-preference";

        // Next.js runtime data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nextDataRaw = (window as any).__NEXT_DATA__;
        const nextData = nextDataRaw
          ? {
              buildId: String(nextDataRaw.buildId ?? ""),
              page: String(nextDataRaw.page ?? ""),
            }
          : undefined;

        // Resource loading stats
        const resourceEntries =
          performance.getEntriesByType?.("resource") ?? [];
        const slowThreshold = 3000;
        const slowResources = resourceEntries.filter(
          (e) => e.duration > slowThreshold,
        );
        const slowestEntry =
          resourceEntries.length > 0
            ? resourceEntries.reduce((a, b) =>
                a.duration > b.duration ? a : b,
              )
            : undefined;

        // Long tasks
        let longTaskCount = 0;
        try {
          longTaskCount = (performance.getEntriesByType?.("longtask") ?? [])
            .length;
        } catch {
          // Not supported
        }

        // Visual viewport
        const vv = window.visualViewport;

        // Active element
        const ae = document.activeElement;

        const sessionStorageKeys = [...Object.keys(sessionStorage)];
        const localStorageKeys = [...Object.keys(localStorage)];
        const cookies = document.cookie
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c);

        const info: DiagnosticsInfo = {
          errorType,
          errorMessage,
          errorTimestamp: now.toISOString(),
          errorTimestampUTC: now.toUTCString(),
          errorEpoch: Date.now(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          nextData,
          currentUrl: window.location.href,
          currentPath: window.location.pathname,
          currentSearch: window.location.search,
          currentHash: window.location.hash,
          origin: window.location.origin,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          port: window.location.port,
          isIframe,
          historyLength: history.length,
          hasOpener: !!window.opener,
          referrer: document.referrer,
          referrerDomain: document.referrer
            ? new URL(document.referrer).hostname
            : "DIRECT/BOOKMARK",
          userAgent: navigator.userAgent,
          browserLanguage: navigator.language,
          browserLanguages: navigator.languages,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack,
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as Navigator & { deviceMemory?: number })
            .deviceMemory,
          maxTouchPoints: navigator.maxTouchPoints,
          prefersColorScheme,
          prefersReducedMotion,
          prefersContrast,
          webdriver: !!navigator.webdriver,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          screenColorDepth: window.screen.colorDepth,
          screenPixelDepth: window.screen.pixelDepth,
          screenAvailWidth: window.screen.availWidth,
          screenAvailHeight: window.screen.availHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          visualViewport: vv
            ? {
                width: Math.round(vv.width),
                height: Math.round(vv.height),
                scale: vv.scale,
                offsetTop: Math.round(vv.offsetTop),
                offsetLeft: Math.round(vv.offsetLeft),
              }
            : undefined,
          connectionType: connection?.effectiveType,
          connectionDownlink: connection?.downlink,
          connectionRtt: connection?.rtt,
          connectionSaveData: connection?.saveData,
          online: navigator.onLine,
          crossOriginIsolated: !!window.crossOriginIsolated,
          pageStayTime: Math.round(performance.now()),
          resourceStats: {
            total: resourceEntries.length,
            slow: slowResources.length,
            slowest: slowestEntry
              ? `${slowestEntry.name.split("/").pop()?.split("?")[0]}(${Math.round(slowestEntry.duration)}ms)`
              : undefined,
          },
          longTaskCount,
          webApis: {
            serviceWorker: "serviceWorker" in navigator,
            webWorkers: typeof Worker !== "undefined",
            webRTC: "RTCPeerConnection" in window,
            webGL: !!document.createElement("canvas").getContext("webgl"),
            webGL2: !!document.createElement("canvas").getContext("webgl2"),
            webSocket: typeof WebSocket !== "undefined",
            localStorage: typeof localStorage !== "undefined",
            sessionStorage: typeof sessionStorage !== "undefined",
            indexedDB: "indexedDB" in window,
            geolocation: "geolocation" in navigator,
            notifications: "Notification" in window,
            pushManager:
              "serviceWorker" in navigator && "PushManager" in window,
            permissions: "permissions" in navigator,
            credentials: "credentials" in navigator,
            paymentRequest: "PaymentRequest" in window,
            webAssembly: typeof WebAssembly !== "undefined",
            sharedWorkers: typeof SharedWorker !== "undefined",
            cryptoSubtle: !!crypto?.subtle,
            clipboard: !!navigator.clipboard,
            swStatus,
          },
          jsEngine: {
            async: typeof window !== "undefined" && "queueMicrotask" in window,
            promises: typeof Promise !== "undefined",
            asyncAwait:
              async function () {}.constructor.name === "AsyncFunction",
            generators: typeof function* () {}.constructor !== "undefined",
            bigInt: typeof BigInt !== "undefined",
            symbols: typeof Symbol !== "undefined",
            proxies: typeof Proxy !== "undefined",
            weakMap: typeof WeakMap !== "undefined",
            weakSet: typeof WeakSet !== "undefined",
            typedArrays: typeof Int8Array !== "undefined",
            dataView: typeof DataView !== "undefined",
          },
          cssFeatures: {
            flexbox: CSS.supports("display", "flex"),
            grid: CSS.supports("display", "grid"),
            variables: CSS.supports("color", "var(--test)"),
            backdropFilter: CSS.supports("backdrop-filter", "blur(5px)"),
            webkitBackdropFilter: CSS.supports(
              "-webkit-backdrop-filter",
              "blur(5px)",
            ),
            sticky: CSS.supports("position", "sticky"),
            objectFit: CSS.supports("object-fit", "cover"),
            clipPath: CSS.supports("clip-path", "circle(50%)"),
            maskImage: CSS.supports("mask-image", "url(#mask)"),
            scrollSnap: CSS.supports("scroll-snap-type", "mandatory"),
            containerQueries: CSS.supports("container-type", "inline-size"),
          },
          errorStack: errorStack || new Error().stack,
          sessionStorage: {
            length: sessionStorage.length,
            keys: sessionStorageKeys,
            keyNames: sessionStorageKeys.join(", ") || "none",
          },
          localStorage: {
            length: localStorage.length,
            keys: localStorageKeys,
            keyNames: localStorageKeys.join(", ") || "none",
          },
          storageQuota,
          cookies: {
            enabled: navigator.cookieEnabled,
            count: cookies.length,
            size: document.cookie.length,
            names: cookies.map((c) => c.split("=")[0]).join(", ") || "none",
          },
          document: {
            title: document.title,
            readyState: document.readyState,
            visibilityState: document.visibilityState,
            hasFocus: document.hasFocus(),
            characterSet: document.characterSet,
            contentType: document.contentType,
            compatMode: document.compatMode,
            lastModified: document.lastModified,
            domain: document.domain,
            URL: document.URL,
            domNodeCount: document.querySelectorAll("*").length,
            scriptsCount: document.scripts.length,
            styleSheetsCount: document.styleSheets.length,
            fontsStatus: document.fonts?.status ?? "unknown",
            fontsCount: document.fonts?.size ?? 0,
            activeElement: ae
              ? `${ae.tagName}${ae.id ? "#" + ae.id : ""}`
              : "none",
          },
        };

        // Performance timing
        if (performance.timing) {
          info.performanceTiming = {
            navigationStart: performance.timing.navigationStart,
            redirectStart: performance.timing.redirectStart,
            redirectEnd: performance.timing.redirectEnd,
            fetchStart: performance.timing.fetchStart,
            domainLookupStart: performance.timing.domainLookupStart,
            domainLookupEnd: performance.timing.domainLookupEnd,
            connectStart: performance.timing.connectStart,
            connectEnd: performance.timing.connectEnd,
            secureConnectionStart: performance.timing.secureConnectionStart,
            requestStart: performance.timing.requestStart,
            responseStart: performance.timing.responseStart,
            responseEnd: performance.timing.responseEnd,
            domLoading: performance.timing.domLoading,
            domInteractive: performance.timing.domInteractive,
            domContentLoadedEventStart:
              performance.timing.domContentLoadedEventStart,
            domContentLoadedEventEnd:
              performance.timing.domContentLoadedEventEnd,
            domComplete: performance.timing.domComplete,
            loadEventStart: performance.timing.loadEventStart,
            loadEventEnd: performance.timing.loadEventEnd,
          };
        }

        // Navigation timing
        if (performance.getEntriesByType) {
          const navigation = performance.getEntriesByType(
            "navigation",
          )[0] as PerformanceNavigationTiming;
          if (navigation) {
            info.navigation = {
              type: navigation.type,
              redirectCount: navigation.redirectCount,
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domLoadTime:
                navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart,
              totalTime: navigation.loadEventEnd - navigation.fetchStart,
              domInteractiveTime:
                navigation.domInteractive - navigation.fetchStart,
              firstByteTime: navigation.responseStart - navigation.fetchStart,
            };
          }
        }

        // Memory (Chrome only)
        if (perfMemory) {
          info.memory = {
            jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
            totalJSHeapSize: perfMemory.totalJSHeapSize,
            usedJSHeapSize: perfMemory.usedJSHeapSize,
            memoryUsage: `${Math.round((perfMemory.usedJSHeapSize / perfMemory.jsHeapSizeLimit) * 100)}%`,
          };
        }

        // Web Vitals
        if (fcpEntry) {
          info.webVitals = { fcp: Math.round(fcpEntry.startTime) };
        }

        // Helper: boolean → T/F
        const tf = (v: boolean) => (v ? "T" : "F");

        // Generate log entries
        const logEntries = [
          `|||||||||||||||||||| NeutralPress Error Diagnostics Log`,
          `==================== [SYSTEM] [ERROR]`,
          `[TIME] UTC: ${info.errorTimestampUTC} | Local: ${info.errorTimestamp} | Epoch: ${info.errorEpoch} | TZ: ${info.timezone}`,
          `[CODE] ${errorType}${info.nextData ? ` | BUILD ${info.nextData.buildId} | PAGE ${info.nextData.page}` : ""}`,
          `==================== [NETWORK] [REQUEST]`,
          `[URL] ${info.currentUrl} | PATH ${info.currentPath} | QUERY ${info.currentSearch || "none"} | HASH ${info.currentHash || "none"} | IFRAME ${tf(info.isIframe)} | HISTORY ${info.historyLength} | OPENER ${tf(info.hasOpener)}`,
          `[REF] ${info.referrer || "none"} | REF_DOMAIN ${info.referrerDomain}`,
          `==================== [CLIENT] [BROWSER]`,
          `[UA] ${info.userAgent}`,
          `[LANG] ${info.browserLanguage} | LANGS ${info.browserLanguages.join(", ")} | SCHEME ${info.prefersColorScheme} | MOTION ${tf(info.prefersReducedMotion)} | CONTRAST ${info.prefersContrast}`,
          `[PLATFORM] ${info.platform} | CPU_CORES ${info.hardwareConcurrency} | MEMORY ${info.deviceMemory ? info.deviceMemory + "GB" : "unknown"} | TOUCH ${info.maxTouchPoints} points | COOKIE ${info.cookieEnabled ? "enabled" : "disabled"} | DNT ${info.doNotTrack ? "enabled" : "disabled"} | WEBDRIVER ${tf(info.webdriver)}`,
          `[SCREEN] ${info.screenWidth}x${info.screenHeight} | AVAIL ${info.screenAvailWidth}x${info.screenAvailHeight} | WINDOW ${info.windowWidth}x${info.windowHeight} | COLOR_DEPTH ${info.screenColorDepth}bit | PIXEL_RATIO ${info.devicePixelRatio}x${info.visualViewport ? ` | VIEWPORT ${info.visualViewport.width}x${info.visualViewport.height} | SCALE ${info.visualViewport.scale}x` : ""}`,
          `==================== [CLIENT] [NETWORK]`,
          `[STATUS] ${info.online ? "online" : "offline"} | CONNECTION ${info.connectionType || "unknown"} | DOWNLINK ${info.connectionDownlink ? info.connectionDownlink + "Mbps" : "unknown"} | RTT ${info.connectionRtt ? info.connectionRtt + "ms" : "unknown"} | SAVE_DATA ${info.connectionSaveData ? "enabled" : "disabled"} | CROSS_ORIGIN_ISOLATED ${tf(info.crossOriginIsolated)}`,
          `==================== [CLIENT] [STORAGE]`,
          `[SESSION_STORAGE] ${info.sessionStorage.length} items: ${info.sessionStorage.keyNames}`,
          `[LOCAL_STORAGE] ${info.localStorage.length} items: ${info.localStorage.keyNames}${info.storageQuota ? ` | QUOTA ${Math.round(info.storageQuota.usage / 1024 / 1024)}MB/${Math.round(info.storageQuota.quota / 1024 / 1024)}MB` : ""}`,
          `[COOKIES] ${info.cookies.count} items (${info.cookies.size} bytes): ${info.cookies.names}`,
          `==================== [CLIENT] [DOCUMENT]`,
          `[DOC] ${info.document.title} | STATE ${info.document.readyState} | VISIBILITY ${info.document.visibilityState} | FOCUS ${tf(info.document.hasFocus)} | COMPAT ${info.document.compatMode} | CHARSET ${info.document.characterSet} | TYPE ${info.document.contentType} | DOMAIN ${info.document.domain} | MODIFIED ${info.document.lastModified} | DOM_NODES ${info.document.domNodeCount} | SCRIPTS ${info.document.scriptsCount} | STYLES ${info.document.styleSheetsCount} | FONTS ${info.document.fontsStatus}(${info.document.fontsCount}) | ACTIVE ${info.document.activeElement}`,
        ];

        if (info.navigation) {
          logEntries.push(
            ``,
            `==================== [PERFORMANCE] [NAVIGATION]`,
            `[NAV_TYPE] ${info.navigation.type} | REDIRECTS ${info.navigation.redirectCount} | LOAD_TIME ${info.navigation.loadTime}ms | DOM_TIME ${info.navigation.domLoadTime}ms | TOTAL_TIME ${info.navigation.totalTime}ms | INTERACTIVE_TIME ${info.navigation.domInteractiveTime}ms | TTFB ${info.navigation.firstByteTime}ms${info.webVitals?.fcp != null ? ` | FCP ${info.webVitals.fcp}ms` : ""} | STAY ${info.pageStayTime}ms | RESOURCES ${info.resourceStats.total}(${info.resourceStats.slow} slow${info.resourceStats.slowest ? ", " + info.resourceStats.slowest : ""}) | LONG_TASKS ${info.longTaskCount}`,
          );
        }

        if (info.memory) {
          logEntries.push(
            ``,
            `==================== [MEMORY] [HEAP]`,
            `[LIMIT] ${Math.round(info.memory.jsHeapSizeLimit / 1024 / 1024)}MB | TOTAL ${Math.round(info.memory.totalJSHeapSize / 1024 / 1024)}MB | USED ${Math.round(info.memory.usedJSHeapSize / 1024 / 1024)}MB | USAGE ${info.memory.memoryUsage}`,
          );
        }

        if (info.webApis) {
          logEntries.push(
            ``,
            `==================== [WEB] [APIS]`,
            `[SERVICE_WORKER] ${tf(info.webApis.serviceWorker)} | [WEB_WORKERS] ${tf(info.webApis.webWorkers)} | [WEB_RTC] ${tf(info.webApis.webRTC)} | [WEB_GL] ${tf(info.webApis.webGL)} | [WEB_GL2] ${tf(info.webApis.webGL2)} | [SW_STATE] ${info.webApis.swStatus}`,
            `[WEB_SOCKET] ${tf(info.webApis.webSocket)} | [INDEXED_DB] ${tf(info.webApis.indexedDB)} | [GEOLOCATION] ${tf(info.webApis.geolocation)} | [NOTIFICATIONS] ${tf(info.webApis.notifications)} | [PAYMENT_REQUEST] ${tf(info.webApis.paymentRequest)}`,
            `[WEB_ASSEMBLY] ${tf(info.webApis.webAssembly)} | [SHARED_WORKERS] ${tf(info.webApis.sharedWorkers)} | [CRYPTO] ${tf(info.webApis.cryptoSubtle)} | [CLIPBOARD] ${tf(info.webApis.clipboard)}`,
          );
        }

        if (info.jsEngine) {
          logEntries.push(
            ``,
            `==================== [JS] [ENGINE]`,
            `[ASYNC] ${tf(info.jsEngine.async)} | [PROMISES] ${tf(info.jsEngine.promises)} | [ASYNC_AWAIT] ${tf(info.jsEngine.asyncAwait)} | [GENERATORS] ${tf(info.jsEngine.generators)} | [BIG_INT] ${tf(info.jsEngine.bigInt)}`,
            `[SYMBOLS] ${tf(info.jsEngine.symbols)} | [PROXIES] ${tf(info.jsEngine.proxies)} | [WEAK_MAP] ${tf(info.jsEngine.weakMap)} | [WEAK_SET] ${tf(info.jsEngine.weakSet)} | [TYPED_ARRAYS] ${tf(info.jsEngine.typedArrays)} | [DATA_VIEW] ${tf(info.jsEngine.dataView)}`,
          );
        }

        if (info.cssFeatures) {
          logEntries.push(
            ``,
            `==================== [CSS] [FEATURES]`,
            `[FLEXBOX] ${tf(info.cssFeatures.flexbox)} | [GRID] ${tf(info.cssFeatures.grid)} | [VARIABLES] ${tf(info.cssFeatures.variables)} | [BACKDROP_FILTER] ${tf(info.cssFeatures.backdropFilter)} | [WEBKIT_BACKDROP_FILTER] ${tf(info.cssFeatures.webkitBackdropFilter)}`,
            `[STICKY] ${tf(info.cssFeatures.sticky)} | [OBJECT_FIT] ${tf(info.cssFeatures.objectFit)} | [CLIP_PATH] ${tf(info.cssFeatures.clipPath)} | [MASK_IMAGE] ${tf(info.cssFeatures.maskImage)} | [SCROLL_SNAP] ${tf(info.cssFeatures.scrollSnap)} | [CONTAINER_QUERIES] ${tf(info.cssFeatures.containerQueries)}`,
          );
        }

        if (info.errorStack) {
          const stackLines = info.errorStack.split("\n");
          const consoleErrorSuffix =
            consoleErrors.length > 0
              ? ` | [CONSOLE_ERRORS] ${consoleErrors.length}: ${consoleErrors.join(" | ")}`
              : "";
          logEntries.push(
            ``,
            `==================== [ERROR] [STACK]`,
            `[STACK_TRACE] ${stackLines.slice(0, 3).join(" | ")}`,
          );
          if (stackLines.length > 3) {
            logEntries.push(
              `[STACK_MORE] ${stackLines
                .slice(3, 10)
                .map((line) => line.trim())
                .join(" | ")}${consoleErrorSuffix}`,
            );
          } else if (consoleErrorSuffix) {
            logEntries[logEntries.length - 1] += consoleErrorSuffix;
          }
        } else if (consoleErrors.length > 0) {
          logEntries[logEntries.length - 1] +=
            ` | [CONSOLE_ERRORS] ${consoleErrors.length}: ${consoleErrors.join(" | ")}`;
        }

        setLogs(logEntries);
      } finally {
        console.error = originalError;
      }
    };

    const timer = setTimeout(() => {
      collectErrorInfo().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, [errorType, errorMessage, errorStack]);

  if (logs.length === 0) {
    return (
      <div className="text-xs opacity-10 font-mono" key="loading">
        <div>[INIT] Collecting diagnostics...</div>
      </div>
    );
  }

  return (
    <div
      className="text-xs space-y-0 opacity-20 font-mono break-all"
      key="logs"
    >
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}
