import { assetUrl } from '../lib/assets.js';

export function ActionArrow() {
  return (
    <img
      className="action-arrow"
      src={assetUrl('assets/icons/arrow-up.svg')}
      alt=""
      aria-hidden="true"
      width="16"
      height="16"
    />
  );
}
