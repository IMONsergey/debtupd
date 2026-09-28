import paths from '../asset-paths.json';
export const assetUrl = (path) =>
  `${import.meta.env.BASE_URL}${(paths[path] || path).replace(/^\//, '')}`;
