/**
 * Resolves when an element matching the selector appears in the DOM, or after timeout.
 */
export function waitForElement(selector, timeoutMs = 8000, resolveWithNullOnTimeout = false) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const t = setTimeout(() => {
      observer.disconnect();
      resolve(resolveWithNullOnTimeout ? null : document.querySelector(selector));
    }, timeoutMs);
  });
}
