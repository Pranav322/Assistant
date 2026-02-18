(function () {
  const scriptTag =
    document.currentScript || document.querySelector('script[src*="embed.js"]');
  if (!scriptTag) {
    return;
  }

  const refreshUrl = scriptTag.getAttribute("data-refresh-url");
  const apiBaseAttr = scriptTag.getAttribute("data-api-base-url");
  const refreshMethod = (scriptTag.getAttribute("data-refresh-method") || "POST").toUpperCase();
  const refreshCredentials =
    scriptTag.getAttribute("data-refresh-credentials") || "include";

  let token = scriptTag.getAttribute("data-token");
  if (!token && !refreshUrl) {
    console.error("[Contextly Widget] Missing data-token attribute.");
    return;
  }

  const mode = scriptTag.getAttribute("data-mode") || "popup";
  const manualWidth = scriptTag.getAttribute("data-width");
  const manualHeight = scriptTag.getAttribute("data-height");

  const projectId =
    scriptTag.getAttribute("data-project-id") ||
    scriptTag.getAttribute("data-project");
  const origin = scriptTag.getAttribute("data-origin") || window.location.origin;
  const widgetUrlAttr = scriptTag.getAttribute("data-widget-url");
  const position = scriptTag.getAttribute("data-position") || "right";
  const offset = scriptTag.getAttribute("data-offset") || "24px";
  const triggerSelector = scriptTag.getAttribute("data-trigger-selector");
  const hideLauncher = scriptTag.getAttribute("data-hide-launcher") === "true";
  // For embedded mode, we always default to open. For popup, we respect the attribute.
  const defaultOpen = mode === "embedded" ? true : scriptTag.getAttribute("data-open") !== "false";
  const buttonLabel = scriptTag.getAttribute("data-button-label") || "Chat";

  const scriptUrl = scriptTag.src ? new URL(scriptTag.src) : null;
  const widgetUrl =
    widgetUrlAttr ||
    (scriptUrl
      ? `${scriptUrl.origin}/widget`
      : `${window.location.origin}/widget`);
  const widgetOrigin = new URL(widgetUrl, window.location.href).origin;
  const apiBaseUrl = (() => {
    if (apiBaseAttr) {
      return apiBaseAttr.replace(/\/$/, "");
    }
    try {
      const base = new URL(widgetOrigin);
      const host = base.host;
      if (host.startsWith("widget.")) {
        return `${base.protocol}//api.${host.slice(7)}/api/v1`;
      }
      if (host.startsWith("app.")) {
        return `${base.protocol}//api.${host.slice(4)}/api/v1`;
      }
      return `${base.origin}/api/v1`;
    } catch {
      return "";
    }
  })();

  const iframeSrc = new URL(widgetUrl, window.location.href);
  iframeSrc.searchParams.set("token", token);
  iframeSrc.searchParams.set("origin", origin);
  if (projectId) {
    iframeSrc.searchParams.set("projectId", projectId);
  }
  if (mode === "embedded") {
    iframeSrc.searchParams.set("mode", "embedded");
  }

  const root = document.createElement("div");
  root.id = "contextly-widget-root";

  if (mode === "embedded") {
    root.style.position = "relative";
    root.style.width = manualWidth || "100%";
    root.style.height = manualHeight || "100%";
    root.style.display = "block";
  } else {
    root.style.position = "fixed";
    root.style.bottom = offset;
    if (position === "left") {
      root.style.left = offset;
    } else {
      root.style.right = offset;
    }
    root.style.zIndex = "999999";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.alignItems = position === "left" ? "flex-start" : "flex-end";
    root.style.gap = "12px";
  }

  root.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif";

  const panel = document.createElement("div");

  if (mode === "embedded") {
    panel.style.width = "100%";
    panel.style.height = "100%";
    panel.style.maxWidth = "none";
    panel.style.maxHeight = "none";
    panel.style.borderRadius = "0";
    panel.style.boxShadow = "none";
  } else {
    panel.style.width = manualWidth || "360px";
    panel.style.maxWidth = "calc(100vw - 48px)";
    panel.style.height = manualHeight || "600px";
    panel.style.maxHeight = "80vh";
  }

  panel.style.display = defaultOpen ? "block" : "none";

  const iframe = document.createElement("iframe");
  iframe.src = iframeSrc.toString();
  iframe.title = "Contextly Chatbot";
  iframe.allow = "clipboard-read; clipboard-write";
  iframe.style.border = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";

  if (mode === "embedded") {
    iframe.style.borderRadius = "0";
    iframe.style.boxShadow = "none";
    iframe.style.background = "transparent";
  } else {
    iframe.style.borderRadius = "20px";
    iframe.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.2)";
    iframe.style.background = "transparent";
  }

  panel.appendChild(iframe);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = buttonLabel;
  button.style.width = "56px";
  button.style.height = "56px";
  button.style.borderRadius = "999px";
  button.style.border = "0";
  button.style.background = "#c2410c";
  button.style.color = "#ffffff";
  button.style.fontSize = "14px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 18px 36px rgba(15, 23, 42, 0.2)";

  // In embedded mode, button is never shown
  const shouldShowButton = mode !== "embedded" && !hideLauncher && !triggerSelector;
  if (!shouldShowButton) {
    button.style.display = "none";
  } else {
    button.style.display = defaultOpen ? "none" : "flex";
  }

  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  let open = defaultOpen;

  function setOpen(nextOpen) {
    // Embedded mode is always open
    if (mode === "embedded") return;

    open = nextOpen;
    panel.style.display = open ? "block" : "none";
    if (shouldShowButton) {
      button.style.display = open ? "none" : "flex";
    }
  }

  button.addEventListener("click", function () {
    setOpen(true);
  });

  if (triggerSelector) {
    const bindTrigger = () => {
      const triggers = document.querySelectorAll(triggerSelector);
      triggers.forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          setOpen(!open);
        });
      });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindTrigger);
    } else {
      bindTrigger();
    }
  }

  root.appendChild(panel);
  if (shouldShowButton) {
    root.appendChild(button);
  }

  const mountId = scriptTag.getAttribute("data-mount-id");
  const mountNode = mountId ? document.getElementById(mountId) : document.body;
  if (mountNode) {
    mountNode.appendChild(root);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      (document.body || document.documentElement).appendChild(root);
    });
  }

  function postToWidget(message) {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, widgetOrigin);
    }
  }

  iframe.addEventListener("load", function () {
    postToWidget({ type: "chatbot:init", token, projectId, origin });
    if (token) {
      scheduleRefresh(token);
    } else {
      refreshToken();
    }
  });

  function setToken(nextToken) {
    if (!nextToken) {
      return;
    }
    token = nextToken;
    postToWidget({ type: "chatbot:set_token", token: nextToken });
    scheduleRefresh(nextToken);
  }

  function parseJwt(rawToken) {
    try {
      const payload = rawToken.split(".")[1];
      if (!payload) return null;
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  let refreshTimer = null;

  function scheduleRefresh(rawToken) {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    const payload = parseJwt(rawToken);
    if (!payload || !payload.exp) {
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const refreshAt = Math.max(payload.exp - 300, now + 30);
    const delayMs = Math.max((refreshAt - now) * 1000, 0);
    refreshTimer = setTimeout(refreshToken, delayMs);
  }

  let refreshInFlight = false;

  async function refreshToken() {
    if (refreshInFlight) {
      return;
    }
    refreshInFlight = true;
    try {
      let response;
      if (refreshUrl) {
        const options = {
          method: refreshMethod,
          credentials: refreshCredentials === "omit" ? "omit" : "include",
          headers: {},
        };
        if (refreshMethod !== "GET") {
          options.headers["Content-Type"] = "application/json";
          options.body = JSON.stringify({ projectId, origin });
        }
        response = await fetch(refreshUrl, options);
      } else if (apiBaseUrl) {
        response = await fetch(`${apiBaseUrl}/tokens/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        return;
      }
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.token) {
        setToken(data.token);
      } else {
        console.error("[Contextly Widget] Token refresh failed.");
      }
    } catch (error) {
      console.error("[Contextly Widget] Token refresh error.", error);
    } finally {
      refreshInFlight = false;
    }
  }

  function handleMessage(event) {
    if (event.origin !== widgetOrigin) {
      return;
    }
    const data = event.data || {};
    if (data.type === "chatbot:resize" && data.payload) {
      if (data.payload.height) {
        panel.style.height = `${data.payload.height}px`;
      }
      if (data.payload.width) {
        panel.style.width = `${data.payload.width}px`;
      }
    }
    if (data.type === "chatbot:token_expired") {
      refreshToken();
      const refreshEvent = new CustomEvent("chatbot:token_expired", {
        detail: { setToken },
      });
      window.dispatchEvent(refreshEvent);
      if (
        window.ChatbotWidget &&
        typeof window.ChatbotWidget.onTokenExpired === "function"
      ) {
        window.ChatbotWidget.onTokenExpired();
      }
    }
  }

  window.addEventListener("message", handleMessage);

  function destroy() {
    window.removeEventListener("message", handleMessage);
    root.remove();
    delete window.ChatbotWidget;
  }

  window.ChatbotWidget = {
    setToken,
    open: function () {
      setOpen(true);
    },
    close: function () {
      setOpen(false);
    },
    toggle: function () {
      setOpen(!open);
    },
    destroy,
    onTokenExpired: null,
    refreshToken,
  };
})();
