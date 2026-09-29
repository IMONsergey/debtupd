import { useEffect } from 'react';
export function useDialog(ref, onClose) {
  useEffect(() => {
    const active = document.activeElement;
    const body = document.body,
      previous = body.style.overflow;
    const root = document.getElementById('page-content');
    body.style.overflow = 'hidden';
    const wasInert = root?.inert;
    if (root) root.inert = true;
    document.dispatchEvent(new Event('debt:dialog-change'));
    const panel = ref.current;
    const focusables = () =>
      [
        ...panel.querySelectorAll(
          'a[href],button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]',
        ),
      ].filter((n) => n.getClientRects().length && n.tabIndex >= 0);
    (panel.querySelector('[data-autofocus]') || focusables()[0] || panel).focus({
      preventScroll: true,
    });
    const handle = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first) {
        e.preventDefault();
        panel.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first || !panel.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      body.style.overflow = previous;
      if (root) root.inert = wasInert;
      document.dispatchEvent(new Event('debt:dialog-change'));
      document.removeEventListener('keydown', handle);
      if (active?.isConnected) active.focus({ preventScroll: true });
    };
  }, [ref, onClose]);
}
