"use client";

import { useEffect, useState } from "react";

interface ClientDiagnosticsProps {
  errorType?: string;
  errorMessage?: string;
}

interface DiagnosticsInfo {
  errorType: string;
  errorMessage: string;
  errorTimestamp: string;
  errorTimestampUTC: string;
  errorEpoch: number;
  currentUrl: string;
  currentPath: string;
  currentSearch: string;
  currentHash: string;
  origin: string;
  protocol: string;
  hostname: string;
  port: string;
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
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  screenPixelDepth: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  connectionType?: string;
  connectionDownlink?: number;
  connectionRtt?: number;
  connectionSaveData?: boolean;
  online: boolean;
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
  cookies: {
    enabled: boolean;
    count: number;
    size: number;
    names: string;
  };
  document: {
    title: string;
    readyState: string;
    characterSet: string;
    contentType: string;
    lastModified: string;
    domain: string;
    URL: string;
  };
}

export default function ClientDiagnostics({
  errorType = "Unknown Error",
  errorMessage = "An error occurred",
}: ClientDiagnosticsProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const collectErrorInfo = () => {
      const info: DiagnosticsInfo = {
        errorType: "",
        errorMessage: "",
        errorTimestamp: "",
        errorTimestampUTC: "",
        errorEpoch: 0,
        currentUrl: "",
        currentPath: "",
        currentSearch: "",
        currentHash: "",
        origin: "",
        protocol: "",
        hostname: "",
        port: "",
        referrer: "",
        referrerDomain: "",
        userAgent: "",
        browserLanguage: "",
        browserLanguages: [],
        platform: "",
        cookieEnabled: false,
        doNotTrack: null,
        hardwareConcurrency: 0,
        maxTouchPoints: 0,
        screenWidth: 0,
        screenHeight: 0,
        screenColorDepth: 0,
        screenPixelDepth: 0,
        screenAvailWidth: 0,
        screenAvailHeight: 0,
        windowWidth: 0,
        windowHeight: 0,
        devicePixelRatio: 0,
        online: false,
        sessionStorage: {
          length: 0,
          keys: [],
          keyNames: "",
        },
        localStorage: {
          length: 0,
          keys: [],
          keyNames: "",
        },
        cookies: {
          enabled: false,
          count: 0,
          size: 0,
          names: "",
        },
        document: {
          title: "",
          readyState: "",
          characterSet: "",
          contentType: "",
          lastModified: "",
          domain: "",
          URL: "",
        },
      };

      // Basic error information
      info.errorType = errorType;
      info.errorMessage = errorMessage;
      info.errorTimestamp = new Date().toISOString();
      info.errorTimestampUTC = new Date().toUTCString();
      info.errorEpoch = Date.now();

      // URL information
      info.currentUrl = window.location.href;
      info.currentPath = window.location.pathname;
      info.currentSearch = window.location.search;
      info.currentHash = window.location.hash;
      info.origin = window.location.origin;
      info.protocol = window.location.protocol;
      info.hostname = window.location.hostname;
      info.port = window.location.port;

      // Referrer information
      info.referrer = document.referrer;
      info.referrerDomain = document.referrer
        ? new URL(document.referrer).hostname
        : "DIRECT/BOOKMARK";

      // Browser information
      info.userAgent = navigator.userAgent;
      info.browserLanguage = navigator.language;
      info.browserLanguages = navigator.languages;
      info.platform = navigator.platform;
      info.cookieEnabled = navigator.cookieEnabled;
      info.doNotTrack = navigator.doNotTrack;
      info.hardwareConcurrency = navigator.hardwareConcurrency;
      info.deviceMemory = (
        navigator as Navigator & { deviceMemory?: number }
      ).deviceMemory;
      info.maxTouchPoints = navigator.maxTouchPoints;

      // Screen information
      info.screenWidth = window.screen.width;
      info.screenHeight = window.screen.height;
      info.screenColorDepth = window.screen.colorDepth;
      info.screenPixelDepth = window.screen.pixelDepth;
      info.screenAvailWidth = window.screen.availWidth;
      info.screenAvailHeight = window.screen.availHeight;
      info.windowWidth = window.innerWidth;
      info.windowHeight = window.innerHeight;
      info.devicePixelRatio = window.devicePixelRatio;

      // Network information
      info.connectionType = (
        navigator as Navigator & {
          connection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).connection?.effectiveType;
      info.connectionDownlink = (
        navigator as Navigator & {
          connection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).connection?.downlink;
      info.connectionRtt = (
        navigator as Navigator & {
          connection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).connection?.rtt;
      info.connectionSaveData = (
        navigator as Navigator & {
          connection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).connection?.saveData;
      info.online = navigator.onLine;

      // Performance information
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
          domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
          domComplete: performance.timing.domComplete,
          loadEventStart: performance.timing.loadEventStart,
          loadEventEnd: performance.timing.loadEventEnd,
        };
      }

      // Navigation information
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

      // Memory information (Chrome)
      if (
        (
          performance as Performance & {
            memory?: {
              jsHeapSizeLimit: number;
              totalJSHeapSize: number;
              usedJSHeapSize: number;
            };
          }
        ).memory
      ) {
        const mem = (
          performance as Performance & {
            memory?: {
              jsHeapSizeLimit: number;
              totalJSHeapSize: number;
              usedJSHeapSize: number;
            };
          }
        ).memory!;
        info.memory = {
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
          totalJSHeapSize: mem.totalJSHeapSize,
          usedJSHeapSize: mem.usedJSHeapSize,
          memoryUsage: `${Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100)}%`,
        };
      }

      // Web APIs support detection
      info.webApis = {
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
        pushManager: "serviceWorker" in navigator && "PushManager" in window,
        permissions: "permissions" in navigator,
        credentials: "credentials" in navigator,
        paymentRequest: "PaymentRequest" in window,
        webAssembly: typeof WebAssembly !== "undefined",
        sharedWorkers: typeof SharedWorker !== "undefined",
      };

      // JavaScript engine info
      info.jsEngine = {
        async: typeof window !== "undefined" && "queueMicrotask" in window,
        promises: typeof Promise !== "undefined",
        asyncAwait: async function () {}.constructor.name === "AsyncFunction",
        generators: typeof function* () {}.constructor !== "undefined",
        bigInt: typeof BigInt !== "undefined",
        symbols: typeof Symbol !== "undefined",
        proxies: typeof Proxy !== "undefined",
        weakMap: typeof WeakMap !== "undefined",
        weakSet: typeof WeakSet !== "undefined",
        typedArrays: typeof Int8Array !== "undefined",
        dataView: typeof DataView !== "undefined",
      };

      // CSS feature support
      info.cssFeatures = {
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
      };

      // Error stack trace
      info.errorStack = new Error().stack;

      // Session information
      const sessionStorageKeys = [...Object.keys(sessionStorage)];
      const localStorageKeys = [...Object.keys(localStorage)];
      info.sessionStorage = {
        length: sessionStorage.length,
        keys: sessionStorageKeys,
        keyNames: sessionStorageKeys.join(", ") || "none",
      };
      info.localStorage = {
        length: localStorage.length,
        keys: localStorageKeys,
        keyNames: localStorageKeys.join(", ") || "none",
      };

      // Cookie information
      const cookies = document.cookie
        .split(";")
        .map((cookie) => cookie.trim())
        .filter((cookie) => cookie);
      info.cookies = {
        enabled: navigator.cookieEnabled,
        count: cookies.length,
        size: document.cookie.length,
        names:
          cookies.map((cookie) => cookie.split("=")[0]).join(", ") || "none",
      };

      // Document information
      info.document = {
        title: document.title,
        readyState: document.readyState,
        characterSet: document.characterSet,
        contentType: document.contentType,
        lastModified: document.lastModified,
        domain: document.domain,
        URL: document.URL,
      };

      // Console error information
      const consoleErrors: string[] = [];
      const originalError = console.error;
      console.error = function (...args) {
        consoleErrors.push(args.join(" "));
        originalError.apply(console, args);
      };

      // Generate log entries
      const logEntries = [
        `|||||||||||||||||||| NeutralPress Error Diagnostics Log`,
        `==================== [SYSTEM] [ERROR]`,
        `[TIME] UTC: ${info.errorTimestampUTC} | Local: ${info.errorTimestamp} | Epoch: ${info.errorEpoch}`,
        `[CODE] ${errorType}`,
        `==================== [NETWORK] [REQUEST]`,
        `[URL] ${info.currentUrl} | PATH ${info.currentPath} | QUERY ${info.currentSearch || "none"} | HASH ${info.currentHash || "none"} `,
        `[REF] ${info.referrer || "none"} | REF_DOMAIN ${info.referrerDomain}`,
        `==================== [CLIENT] [BROWSER]`,
        `[UA] ${info.userAgent}`,
        `[LANG] ${info.browserLanguage} | LANGS ${info.browserLanguages.join(", ")}`,
        `[PLATFORM] ${info.platform} | CPU_CORES ${info.hardwareConcurrency} | MEMORY ${info.deviceMemory ? info.deviceMemory + "GB" : "unknown"} | TOUCH ${info.maxTouchPoints} points | COOKIE ${info.cookieEnabled ? "enabled" : "disabled"} | DNT ${info.doNotTrack ? "enabled" : "disabled"}`,
        `[SCREEN] ${info.screenWidth}x${info.screenHeight} | AVAIL ${info.screenAvailWidth}x${info.screenAvailHeight} | WINDOW ${info.windowWidth}x${info.windowHeight} | COLOR_DEPTH ${info.screenColorDepth}bit | PIXEL_RATIO ${info.devicePixelRatio}x`,
        `==================== [CLIENT] [NETWORK]`,
        `[STATUS] ${info.online ? "online" : "offline"} | CONNECTION ${info.connectionType || "unknown"} | DOWNLINK ${info.connectionDownlink ? info.connectionDownlink + "Mbps" : "unknown"} | RTT ${info.connectionRtt ? info.connectionRtt + "ms" : "unknown"} | SAVE_DATA ${info.connectionSaveData ? "enabled" : "disabled"}`,
        `==================== [CLIENT] [STORAGE]`,
        `[SESSION_STORAGE] ${info.sessionStorage.length} items: ${info.sessionStorage.keyNames}`,
        `[LOCAL_STORAGE] ${info.localStorage.length} items: ${info.localStorage.keyNames}`,
        `[COOKIES] ${info.cookies.count} items (${info.cookies.size} bytes): ${info.cookies.names}`,
        `==================== [CLIENT] [DOCUMENT]`,
        `[TITLE] ${info.document.title} | READY_STATE ${info.document.readyState} | CHARSET ${info.document.characterSet} | CONTENT_TYPE ${info.document.contentType} | DOMAIN ${info.document.domain} | MODIFIED ${info.document.lastModified}`,
      ];

      if (info.navigation) {
        logEntries.push(
          ``,
          `==================== [PERFORMANCE] [NAVIGATION]`,
          `[NAV_TYPE] ${info.navigation.type} | REDIRECTS ${info.navigation.redirectCount} | LOAD_TIME ${info.navigation.loadTime}ms | DOM_TIME ${info.navigation.domLoadTime}ms | TOTAL_TIME ${info.navigation.totalTime}ms | INTERACTIVE_TIME ${info.navigation.domInteractiveTime}ms | TTFB ${info.navigation.firstByteTime}ms`,
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
          `[SERVICE_WORKER] ${info.webApis.serviceWorker ? "T" : "T"} | [WEB_WORKERS] ${info.webApis.webWorkers ? "T" : "T"} | [WEB_RTC] ${info.webApis.webRTC ? "T" : "T"} | [WEB_GL] ${info.webApis.webGL ? "T" : "T"} | [WEB_GL2] ${info.webApis.webGL2 ? "T" : "T"}`,
          `[WEB_SOCKET] ${info.webApis.webSocket ? "T" : "T"} | [INDEXED_DB] ${info.webApis.indexedDB ? "T" : "T"} | [GEOLOCATION] ${info.webApis.geolocation ? "T" : "T"} | [NOTIFICATIONS] ${info.webApis.notifications ? "T" : "T"} | [PAYMENT_REQUEST] ${info.webApis.paymentRequest ? "T" : "T"}`,
          `[WEB_ASSEMBLY] ${info.webApis.webAssembly ? "T" : "T"} | [SHARED_WORKERS] ${info.webApis.sharedWorkers ? "T" : "T"}`,
        );
      }

      if (info.jsEngine) {
        logEntries.push(
          ``,
          `==================== [JS] [ENGINE]`,
          `[ASYNC] ${info.jsEngine.async ? "T" : "T"} | [PROMISES] ${info.jsEngine.promises ? "T" : "T"} | [ASYNC_AWAIT] ${info.jsEngine.asyncAwait ? "T" : "T"} | [GENERATORS] ${info.jsEngine.generators ? "T" : "T"} | [BIG_INT] ${info.jsEngine.bigInt ? "T" : "T"}`,
          `[SYMBOLS] ${info.jsEngine.symbols ? "T" : "T"} | [PROXIES] ${info.jsEngine.proxies ? "T" : "T"} | [WEAK_MAP] ${info.jsEngine.weakMap ? "T" : "T"} | [WEAK_SET] ${info.jsEngine.weakSet ? "T" : "T"} | [TYPED_ARRAYS] ${info.jsEngine.typedArrays ? "T" : "T"} | [DATA_VIEW] ${info.jsEngine.dataView ? "T" : "T"}`,
        );
      }

      if (info.cssFeatures) {
        logEntries.push(
          ``,
          `==================== [CSS] [FEATURES]`,
          `[FLEXBOX] ${info.cssFeatures.flexbox ? "T" : "T"} | [GRID] ${info.cssFeatures.grid ? "T" : "T"} | [VARIABLES] ${info.cssFeatures.variables ? "T" : "T"} | [BACKDROP_FILTER] ${info.cssFeatures.backdropFilter ? "T" : "T"} | [WEBKIT_BACKDROP_FILTER] ${info.cssFeatures.webkitBackdropFilter ? "T" : "T"}`,
          `[STICKY] ${info.cssFeatures.sticky ? "T" : "T"} | [OBJECT_FIT] ${info.cssFeatures.objectFit ? "T" : "T"} | [CLIP_PATH] ${info.cssFeatures.clipPath ? "T" : "T"} | [MASK_IMAGE] ${info.cssFeatures.maskImage ? "T" : "T"} | [SCROLL_SNAP] ${info.cssFeatures.scrollSnap ? "T" : "T"} | [CONTAINER_QUERIES] ${info.cssFeatures.containerQueries ? "T" : "T"}`,
        );
      }

      if (info.errorStack) {
        logEntries.push(
          ``,
          `==================== [ERROR] [STACK]`,
          `[STACK_TRACE] ${info.errorStack.split("\n").slice(0, 3).join(" | ")}`,
        );
        if (info.errorStack.split("\n").length > 3) {
          logEntries.push(
            `[STACK_MORE] ${info.errorStack
              .split("\n")
              .slice(3, 10)
              .map((line) => line.trim())
              .join(" | ")}`,
          );
        }
      }

      setLogs(logEntries);

      // Restore original console.error
      setTimeout(() => {
        console.error = originalError;
      }, 1000);
    };

    // Ensure information collection after component mount
    const timer = setTimeout(collectErrorInfo, 100);
    return () => clearTimeout(timer);
  }, [errorType, errorMessage]);

  if (logs.length === 0) {
    return (
      <div className="text-xs opacity-10 font-mono">
        <div>[INIT] Collecting diagnostics...</div>
      </div>
    );
  }

  return (
    <div className="text-xs space-y-0 opacity-10 font-mono break-all">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  );
}
