import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ActionArrow } from './ActionArrow.jsx';
import { destinations } from '../navigation.js';
import '../styles/space-navigation.css';
const shipImageSrc = `${import.meta.env.BASE_URL}assets/menu-spaceship.png`;

export function SpaceNavigation({ mobile = false, onNavigate }) {
  const [active, setActive] = useState('about-forum');
  const [open, setOpen] = useState(false);
  const [routeHeight, setRouteHeight] = useState(0);
  const navRef = useRef(null),
    shipRef = useRef(null),
    toggleRef = useRef(null);
  const destinationRef = useRef(null),
    pendingTimer = useRef(0);
  const panelId = useId();
  const routeProgress =
    Math.max(
      0,
      destinations.findIndex((item) => item.id === active),
    ) /
    (destinations.length - 1);
  useEffect(() => {
    const ro = new ResizeObserver(() => setRouteHeight(navRef.current?.offsetHeight || 0));
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    let frame = 0,
      positions = [],
      viewportHeight = innerHeight,
      pageHeight = 0;
    const update = () => {
      frame = 0;
      if (destinationRef.current) return;
      let current = destinations[0].id;
      const y = scrollY + viewportHeight * 0.3;
      for (const section of positions) if (section.top <= y) current = section.id;
      if (scrollY + viewportHeight >= pageHeight - 4) current = 'contacts';
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const measure = () => {
      const scroll = scrollY;
      positions = destinations.flatMap((item) => {
        const node = document.getElementById(item.id);
        return node ? [{ id: item.id, top: node.getBoundingClientRect().top + scroll }] : [];
      });
      viewportHeight = innerHeight;
      pageHeight = document.documentElement.scrollHeight;
      schedule();
    };
    const interrupt = () => {
      destinationRef.current = null;
      clearTimeout(pendingTimer.current);
      schedule();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    measure();
    document.fonts.ready.then(measure);
    document.addEventListener('debt:preloader-closed', measure);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', measure);
    addEventListener('scrollend', interrupt);
    addEventListener('wheel', interrupt, { passive: true });
    addEventListener('touchstart', interrupt, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(pendingTimer.current);
      ro.disconnect();
      document.removeEventListener('debt:preloader-closed', measure);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', measure);
      removeEventListener('scrollend', interrupt);
      removeEventListener('wheel', interrupt);
      removeEventListener('touchstart', interrupt);
    };
  }, []);
  useLayoutEffect(() => {
    if (mobile && !open) return;
    const row = navRef.current?.querySelector(`[data-route-id="${active}"]`);
    if (row && shipRef.current)
      shipRef.current.style.transform = `translate3d(12px,${row.offsetTop + row.offsetHeight / 2}px,0)`;
  }, [active, mobile, open, routeHeight]);
  useEffect(() => {
    if (!mobile || !open) return;
    const key = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const outside = (event) => {
      if (!navRef.current?.parentElement.contains(event.target)) setOpen(false);
    };
    addEventListener('keydown', key);
    addEventListener('pointerdown', outside);
    return () => {
      removeEventListener('keydown', key);
      removeEventListener('pointerdown', outside);
    };
  }, [mobile, open]);
  const navigate = (event, item) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(item.anchor || item.id);
    if (!section) return;
    event.preventDefault();
    destinationRef.current = item.id;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      destinationRef.current = null;
    }, 2400);
    setActive(item.id);
    history.replaceState(null, '', `#${item.anchor || item.id}`);
    onNavigate?.();
    if (mobile) {
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
    // Exactly one scroll animation. Never restart CSS smooth scrolling on every JS frame.
    window.scrollTo({
      top: Math.max(0, section.getBoundingClientRect().top + scrollY - (mobile ? 80 : 36)),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  return (
    <div
      className={`space-navigation${mobile ? ' space-navigation--mobile' : ''}${open ? ' is-open' : ''}`}
    >
      {mobile && (
        <button
          ref={toggleRef}
          className="space-navigation__toggle"
          type="button"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      )}
      <nav
        ref={navRef}
        id={panelId}
        className="space-route"
        style={{ '--route-progress': routeProgress }}
        aria-label="Разделы сайта"
        inert={mobile && !open ? true : undefined}
      >
        <div className="space-route__rail" aria-hidden="true">
          <span className="space-route__rail-light" />
        </div>
        {destinations.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-route-id={item.id}
            className={`space-route__stop${active === item.id ? ' is-active' : ''}`}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={(event) => navigate(event, item)}
          >
            <span className="space-route__branch" aria-hidden="true" />
            <span className={`space-planet space-planet--${index % 7}`} aria-hidden="true">
              <span className="space-planet__surface" />
              <span className="space-planet__orbit" />
            </span>
            <span className="space-route__label">{item.label}</span>
          </a>
        ))}
        {mobile && (
          <a
            className="button space-route__register"
            href="#tariff-plans"
            onClick={(event) => navigate(event, { id: 'tariffs', anchor: 'tariff-plans' })}
          >
            <span className="button-label">Ранняя регистрация</span>
            <ActionArrow />
          </a>
        )}
        <span ref={shipRef} className="space-route__ship" aria-hidden="true">
          <img
            className="space-route__ship-image"
            src={shipImageSrc}
            alt=""
            width="42"
            height="42"
            decoding="async"
          />
        </span>
      </nav>
    </div>
  );
}
