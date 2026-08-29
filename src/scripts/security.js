(function () {
  "use strict";

  if (!window.DOMPurify) {
    throw new Error("The local HTML sanitizer failed to load.");
  }

  function sanitizeHTML(value) {
    return window.DOMPurify.sanitize(String(value ?? ""), {
      ADD_ATTR: ["target"],
      USE_PROFILES: { html: true },
    });
  }

  function setHTML(element, value) {
    if (!element) return;

    const tagName = element.tagName.toLowerCase();
    if (tagName === "tr" || ["tbody", "thead", "tfoot"].includes(tagName)) {
      const wrappedHTML = tagName === "tr"
        ? `<table><tbody><tr>${String(value ?? "")}</tr></tbody></table>`
        : `<table><${tagName}>${String(value ?? "")}</${tagName}></table>`;
      const wrapperRange = document.createRange();
      wrapperRange.selectNodeContents(document.body);
      const wrapperFragment = wrapperRange.createContextualFragment(
        sanitizeHTML(wrappedHTML),
      );
      const sanitizedContainer = wrapperFragment.querySelector(tagName);
      element.replaceChildren(...Array.from(sanitizedContainer?.childNodes || []));
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    const sanitizedHTML = sanitizeHTML(value);
    const fragment = range.createContextualFragment(sanitizedHTML);
    element.replaceChildren(fragment);
  }

  function findShow(fileSlug) {
    return (window.allShowsData || []).find(
      (show) => show && show.fileSlug === fileSlug,
    );
  }

  function activateTrigger(trigger) {
    if (trigger.matches(".image-modal-trigger")) {
      const show = findShow(trigger.dataset.showId);
      const images = Array.isArray(show?.images) ? show.images : [];
      const imageId = trigger.dataset.imageId;
      if (imageId && images.length && typeof window.openModal === "function") {
        window.openModal(imageId, images);
      }
      return;
    }

    if (trigger.matches(".json-editor-trigger")) {
      if (typeof window.openJsonEditor === "function") {
        window.openJsonEditor(trigger.dataset.showId, trigger.dataset.showType);
      }
      return;
    }

    if (trigger.matches(".note-block, .credits-block")) {
      if (typeof window.maybeExpand === "function") window.maybeExpand(trigger);
      return;
    }

    if (trigger.matches(".info-icon") && typeof window.toggleFeatInfo === "function") {
      window.toggleFeatInfo(trigger);
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(
      ".image-modal-trigger, .json-editor-trigger, .note-block, .credits-block, .info-icon",
    );
    if (trigger) activateTrigger(trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const trigger = event.target.closest('[role="button"]');
    if (!trigger) return;
    event.preventDefault();
    activateTrigger(trigger);
  });

  window.tlSecurity = Object.freeze({ sanitizeHTML, setHTML, findShow });
})();
