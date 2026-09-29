import { useEffect, useRef, useState } from 'react';
import { StarField } from '../Cosmos.jsx';
import { assetUrl } from '../../lib/assets.js';
import { OrbitGlow } from './OrbitGlow.jsx';
const image = (name) => assetUrl(`assets/hero/${name}`);
export function HeroScene() {
  const orbit = useRef(null),
    scene = useRef(null);
  const [entered, setEntered] = useState(() => !document.getElementById('site-preloader'));
  useEffect(() => {
    const enter = () => setEntered(true);
    document.addEventListener('debt:preloader-closed', enter);
    const io = new IntersectionObserver((entries) =>
      scene.current?.classList.toggle('is-offscreen', !entries[0].isIntersecting),
    );
    if (scene.current) io.observe(scene.current);
    return () => {
      document.removeEventListener('debt:preloader-closed', enter);
      io.disconnect();
    };
  }, []);
  useEffect(() => {
    let cancelled = false,
      completed = 0;
    const paths = [
      innerWidth < 700 ? 'planet-mobile.webp' : 'planet.webp',
      'brand-haze.webp',
      'wordmark.svg',
      'planet-crown.webp',
    ];
    const progress = () => {
      completed++;
      if (!cancelled)
        document.dispatchEvent(
          new CustomEvent('debt:progress', { detail: { completed, total: 5 } }),
        );
    };
    const loads = paths.map(
      (path) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.fetchPriority = 'high';
          img.onload = () =>
            img
              .decode()
              .catch(() => {})
              .finally(() => {
                progress();
                resolve();
              });
          img.onerror = () => {
            progress();
            resolve();
          };
          img.src = image(path);
        }),
    );
    loads.push(document.fonts.ready.then(progress, progress));
    Promise.allSettled(loads).then(() => {
      if (!cancelled) document.dispatchEvent(new Event('debt:ready'));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="hero-layer-scene" ref={scene} data-entered={entered}>
      <OrbitGlow orbitRef={orbit} />
      <StarField className="hero-stars" />
      <img
        className="hero-brand-haze"
        src={image('brand-haze.webp')}
        width="954"
        height="805"
        alt=""
        decoding="async"
      />
      <img
        className="hero-wordmark"
        src={image('wordmark.svg')}
        width="536"
        height="289"
        alt=""
        decoding="async"
      />
      <div ref={orbit} className="hero-planet-orbit hero-orbit" aria-hidden="true">
        <div className="hero-planet-disc">
          <picture className="hero-planet-rotation">
            <source media="(max-width:699px)" srcSet={image('planet-mobile.webp')} />
            <img
              src={image('planet.webp')}
              width="2048"
              height="2048"
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="hero-planet-shade" />
        </div>
      </div>
      <div className="hero-crown-orbit hero-orbit" aria-hidden="true">
        <img
          className="hero-planet-crown"
          src={image('planet-crown.webp')}
          width="1861"
          height="550"
          alt=""
          decoding="async"
        />
      </div>
      <div className="hero-bottom-shade" aria-hidden="true" />
      <p className="hero-universe">
        <span>Вселенная</span>
        <span>технологий</span>
      </p>
    </div>
  );
}
