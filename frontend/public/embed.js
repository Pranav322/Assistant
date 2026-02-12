(function () {
  const scriptTag =
    document.currentScript || document.querySelector('script[src*="embed.js"]');
  if (!scriptTag) {
    return;
  }

  let token = scriptTag.getAttribute("data-token");
  if (!token) {
    console.error("[Orizn Widget] Missing data-token attribute.");
    return;
  }

  const projectId =
    scriptTag.getAttribute("data-project-id") ||
    scriptTag.getAttribute("data-project");
  const origin = scriptTag.getAttribute("data-origin") || window.location.origin;
  const widgetUrlAttr = scriptTag.getAttribute("data-widget-url");
  const position = scriptTag.getAttribute("data-position") || "right";
  const offset = scriptTag.getAttribute("data-offset") || "24px";
  const defaultOpen = scriptTag.getAttribute("data-open") !== "false";
  const buttonLabel = scriptTag.getAttribute("data-button-label") || "Chat";

  const scriptUrl = scriptTag.src ? new URL(scriptTag.src) : null;
  const widgetUrl =
    widgetUrlAttr ||
    (scriptUrl
      ? `${scriptUrl.origin}/widget`
      : `${window.location.origin}/widget`);
  const widgetOrigin = new URL(widgetUrl, window.location.href).origin;

  const iframeSrc = new URL(widgetUrl, window.location.href);
  iframeSrc.searchParams.set("token", token);
  iframeSrc.searchParams.set("origin", origin);
  if (projectId) {
    iframeSrc.searchParams.set("projectId", projectId);
  }

  const root = document.createElement("div");
  root.id = "orizn-widget-root";
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
  root.style.fontFamily =
    "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif";

  const panel = document.createElement("div");
  panel.style.width = "360px";
  panel.style.maxWidth = "calc(100vw - 48px)";
  panel.style.height = "520px";
  panel.style.maxHeight = "80vh";
  panel.style.display = defaultOpen ? "block" : "none";

  const iframe = document.createElement("iframe");
  iframe.src = iframeSrc.toString();
  iframe.title = "Orizn Chatbot";
  iframe.allow = "clipboard-read; clipboard-write";
  iframe.style.border = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.borderRadius = "20px";
  iframe.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.2)";
  iframe.style.background = "transparent";

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
  button.style.display = defaultOpen ? "none" : "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  let open = defaultOpen;

  function setOpen(nextOpen) {
    open = nextOpen;
    panel.style.display = open ? "block" : "none";
    button.style.display = open ? "none" : "flex";
  }

  button.addEventListener("click", function () {
    setOpen(true);
  });

  root.appendChild(panel);
  root.appendChild(button);

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
  });

  function setToken(nextToken) {
    if (!nextToken) {
      return;
    }
    token = nextToken;
    postToWidget({ type: "chatbot:set_token", token: nextToken });
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
  };
})();
