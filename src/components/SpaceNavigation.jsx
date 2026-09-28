import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import '../styles/space-navigation.css';

const destinations = [
  { id: 'about-forum', targetId: 'about-forum', label: 'О форуме', spy: true },
  { id: 'venue', targetId: 'venue', label: 'Место проведения', spy: true },
  { id: 'gallery', targetId: 'gallery', label: 'Кадры с DEBT TECH 2025', spy: true },
  { id: 'organizer', targetId: 'organizer', label: 'Организатор', spy: true },
  {
    id: 'other-conferences',
    targetId: 'other-conferences',
    label: 'Другие конференции',
    spy: true,
  },
  { id: 'tariffs', targetId: 'tariffs', label: 'Тарифы', spy: true },
  { id: 'contacts', targetId: 'contacts', label: 'Контакты', spy: true },
];

const shipImageSrc = `${import.meta.env.BASE_URL}assets/menu-spaceship.png`;
const shipDockX = 12;
const shipOrbitX = -3;

export function SpaceNavigation({ mobile = false, onGallery, onNavigate }) {
  const [active, setActive] = useState('about-forum');
  const [open, setOpen] = useState(false);
  const [routeHeight, setRouteHeight] = useState(0);
  const navRef = useRef(null);
  const shipRef = useRef(null);
  const toggleRef = useRef(null);
  const flightRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const destinationRef = useRef(null);
  const initialized = useRef(false);
  const panelId = useId();
  const routeProgress =
    destinations.findIndex((item) => item.id === active) / (destinations.length - 1);

  useEffect(() => {
    const observer = new ResizeObserver(() => setRouteHeight(navRef.current.offsetHeight));
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const pending = destinationRef.current;
      if (pending && performance.now() < pending.until) {
        const target = document.getElementById(pending.id);
        if (target && Math.abs(target.getBoundingClientRect().top - 24) > 30) return;
      }
      destinationRef.current = null;
      let current = 'about-forum';
      for (const item of destinations.filter((destination) => destination.spy)) {
        const section = document.getElementById(item.targetId);
        if (section && section.getBoundingClientRect().top <= innerHeight * 0.32) current = item.id;
      }
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) current = 'contacts';
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const interrupt = () => {
      destinationRef.current = null;
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('scrollend', interrupt);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('scrollend', interrupt);
    };
  }, []);

  useLayoutEffect(() => {
    const ship = shipRef.current;
    const nav = navRef.current;
    if (!ship || !nav || (mobile && !open)) return;
    const row = nav.querySelector(`[data-route-id="${active}"]`);
    if (!row) return;
    const y = row.offsetTop + row.offsetHeight / 2;
    const from = getComputedStyle(ship).transform;
    const matrix = from === 'none' ? null : new DOMMatrixReadOnly(from);
    const currentX = matrix ? matrix.m41 : shipDockX;
    const currentY = matrix ? matrix.m42 : y;
    flightRef.current?.cancel();
    const target = `translate(${shipDockX}px, ${y}px) rotate(0deg)`;
    if (!initialized.current || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      initialized.current = true;
      ship.style.transform = target;
      return;
    }
    ship.style.transform = `translate(${currentX}px, ${currentY}px) rotate(0deg)`;
    ship.classList.add('is-flying');
    // A sampled cubic curve keeps takeoff, vertical travel and docking continuous.
    // Starting from the rendered coordinates also prevents snapping on rapid clicks.
    const distanceY = y - currentY;
    const controlStartY = currentY + distanceY * 0.16;
    const controlEndY = y - distanceY * 0.16;
    const frames = Array.from({ length: 41 }, (_, index) => {
      const progress = index / 40;
      const t = progress;
      const inverse = 1 - t;
      const x =
        inverse ** 3 * currentX +
        3 * inverse ** 2 * t * shipOrbitX +
        3 * inverse * t ** 2 * shipOrbitX +
        t ** 3 * shipDockX;
      const frameY =
        inverse ** 3 * currentY +
        3 * inverse ** 2 * t * controlStartY +
        3 * inverse * t ** 2 * controlEndY +
        t ** 3 * y;
      return { transform: `translate(${x}px, ${frameY}px) rotate(0deg)`, offset: progress };
    });
    const duration = Math.min(2200, Math.max(1350, 1150 + Math.abs(distanceY) * 5));
    const flight = ship.animate(frames, { duration, easing: 'cubic-bezier(.22,.55,.28,1)' });
    flightRef.current = flight;
    flight.onfinish = () => {
      if (flightRef.current !== flight) return;
      ship.style.transform = target;
      ship.classList.remove('is-flying');
      flightRef.current = null;
    };
  }, [active, mobile, open, routeHeight]);

  useEffect(
    () => () => {
      flightRef.current?.cancel();
      cancelAnimationFrame(scrollAnimationRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!mobile || !open) return;
    const close = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const outside = (event) => {
      if (!navRef.current?.parentElement.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', outside);
    };
  }, [mobile, open]);

  const navigate = (event, item) => {
    if (item.id === 'gallery' && onGallery) {
      event.preventDefault();
      setOpen(false);
      onGallery();
      return;
    }
    onNavigate?.();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(item.targetId);
    if (!section) return;
    event.preventDefault();
    destinationRef.current = { id: item.targetId, until: performance.now() + 2000 };
    setActive(item.id);
    history.replaceState(null, '', `#${item.targetId}`);
    const offset = innerWidth < 1181 ? 80 : 36;
    const targetY = Math.max(0, section.getBoundingClientRect().top + scrollY - offset);
    // The drawer unmounts on navigation. Let native scrolling complete independently.
    if (onNavigate) {
      window.scrollTo({
        top: targetY,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      return;
    }
    cancelAnimationFrame(scrollAnimationRef.current);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, targetY);
    } else {
      const startY = scrollY;
      const distance = targetY - startY;
      const duration = Math.min(1400, Math.max(760, Math.abs(distance) * 0.28));
      const startedAt = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, startY + distance * eased);
        if (progress < 1) scrollAnimationRef.current = requestAnimationFrame(step);
        else scrollAnimationRef.current = null;
      };
      scrollAnimationRef.current = requestAnimationFrame(step);
    }
    if (mobile) {
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
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
          title={open ? 'Закрыть меню' : 'Открыть меню'}
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
            href={`#${item.targetId}`}
            data-route-id={item.id}
            className={`space-route__stop${active === item.id ? ' is-active' : ''}`}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={(event) => navigate(event, item)}
          >
            <span className="space-route__branch" aria-hidden="true" />
            <span className={`space-planet space-planet--${index}`} aria-hidden="true">
              <span className="space-planet__surface" />
              <span className="space-planet__orbit" />
            </span>
            <span className="space-route__label">{item.label}</span>
          </a>
        ))}
        <span ref={shipRef} className="space-route__ship" aria-hidden="true">
          <img
            className="space-route__ship-image"
            src={shipImageSrc}
            alt=""
            width="42"
            height="42"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />
        </span>
      </nav>
    </div>
  );
}
