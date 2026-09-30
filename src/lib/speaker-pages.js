// The last tablet page stays filled while still revealing the final speaker.
export function speakerPageStarts(count, perPage) {
  const size = Math.max(1, perPage);
  return Array.from({ length: Math.ceil(count / size) }, (_, page) =>
    Math.min(page * size, Math.max(0, count - size)),
  );
}
