(function (root) {
  var OVERLAY_ID = "image-lightbox";

  function docOf(doc) {
    return doc || root.document;
  }

  function isFigureTarget(node) {
    if (!node || node.tagName !== "IMG") return false;
    if (typeof node.closest === "function") {
      return !!node.closest(".article-body figure");
    }
    var el = node.parentNode;
    var inFigure = false;
    var inArticle = false;
    while (el) {
      var name = (el.tagName || "").toLowerCase();
      var cls = (el.className || "").toString();
      if (name === "figure") inFigure = true;
      if (name === "article" || /(^|\s)article-body(\s|$)/.test(cls)) inArticle = true;
      el = el.parentNode;
    }
    return inFigure && inArticle;
  }

  function ensureOverlay(doc) {
    var d = docOf(doc);
    var overlay = d.getElementById(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = d.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "image-lightbox";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Enlarged image");
    var backdrop = d.createElement("button");
    backdrop.type = "button";
    backdrop.className = "image-lightbox-backdrop";
    backdrop.setAttribute("aria-label", "Close image");
    var frame = d.createElement("figure");
    frame.className = "image-lightbox-frame";
    var img = d.createElement("img");
    img.alt = "";
    frame.appendChild(img);
    overlay.appendChild(backdrop);
    overlay.appendChild(frame);
    (d.body || d.documentElement).appendChild(overlay);
    return overlay;
  }

  function open(src, alt, doc) {
    if (!src) return null;
    var d = docOf(doc);
    var overlay = ensureOverlay(d);
    var img = overlay.querySelector("img");
    img.setAttribute("src", src);
    img.setAttribute("alt", alt || "");
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.setAttribute("data-src", src);
    d.documentElement.classList.add("lightbox-open");
    return overlay;
  }

  function close(doc) {
    var d = docOf(doc);
    var overlay = d.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.setAttribute("data-src", "");
    var img = overlay.querySelector("img");
    if (img) {
      img.removeAttribute("src");
      img.setAttribute("alt", "");
    }
    d.documentElement.classList.remove("lightbox-open");
  }

  function isOpen(doc) {
    var overlay = docOf(doc).getElementById(OVERLAY_ID);
    return !!(overlay && overlay.classList.contains("is-open") && overlay.hidden !== true);
  }

  function currentSrc(doc) {
    var overlay = docOf(doc).getElementById(OVERLAY_ID);
    if (!overlay || !isOpen(doc)) return "";
    return overlay.getAttribute("data-src") || "";
  }

  function handleClick(event, doc) {
    var d = docOf(doc);
    var target = event && event.target;
    if (!target) return false;
    var closest = typeof target.closest === "function" ? target.closest.bind(target) : null;
    var backdrop = closest
      ? target.closest(".image-lightbox-backdrop")
      : (target.className || "").toString().indexOf("image-lightbox-backdrop") !== -1
        ? target
        : null;
    if (backdrop || (target.id === OVERLAY_ID && isOpen(d))) {
      close(d);
      return true;
    }
    var img = closest ? target.closest("img") : target.tagName === "IMG" ? target : null;
    if (isFigureTarget(img)) {
      if (event.preventDefault) event.preventDefault();
      open(img.getAttribute("src") || img.src, img.getAttribute("alt") || "", d);
      return true;
    }
    return false;
  }

  function handleKeydown(event, doc) {
    var key = event && (event.key || event.keyCode);
    if (key === "Escape" || key === "Esc" || key === 27) {
      close(doc);
      return true;
    }
    return false;
  }

  function init(doc) {
    var d = docOf(doc);
    if (!d || !d.addEventListener) return;
    if (d.documentElement.getAttribute("data-lightbox-init") === "1") return;
    d.documentElement.setAttribute("data-lightbox-init", "1");
    ensureOverlay(d);
    d.addEventListener("click", function (event) {
      handleClick(event, d);
    });
    d.addEventListener("keydown", function (event) {
      handleKeydown(event, d);
    });
  }

  root.ReverenceLightbox = {
    isFigureTarget: isFigureTarget,
    open: open,
    close: close,
    isOpen: isOpen,
    currentSrc: currentSrc,
    handleClick: handleClick,
    handleKeydown: handleKeydown,
    init: init,
    OVERLAY_ID: OVERLAY_ID,
  };

  if (root.document && root.document.addEventListener) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () {
        init(root.document);
      });
    } else {
      init(root.document);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
