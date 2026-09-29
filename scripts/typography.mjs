import Typograf from 'typograf';
const typograf = new Typograf({
  locale: ['ru'],
  disable: ['*'],
  enable: ['common/nbsp/afterShortWord', 'common/nbsp/afterShortWordByList'],
});
// Editorial spacing only. Do not rewrite approved wording, numbers, URLs or form values.
export function typeset(text) {
  if (
    typeof text !== 'string' ||
    !/[А-Яа-яЁё]/u.test(text) ||
    /(?:https?:\/\/|mailto:|tel:)/i.test(text)
  )
    return text;
  const leading = text.match(/^\s*/u)[0];
  const trailing = text.match(/\s*$/u)[0];
  const core = text.slice(leading.length, text.length - trailing.length);
  return leading + typograf.execute(core).replace(/(\d)[ \u00a0]+([₽%])/g, '$1\u00a0$2') + trailing;
}
export function typographyBabel({ types: t }) {
  return {
    name: 'debt-editorial-spacing',
    visitor: {
      StringLiteral(path) {
        if (path.parent.type === 'ObjectProperty' && path.key === 'key') return;
        // JSX attribute literals are HTML, not JavaScript strings; keep accessible names intact.
        if (path.parent.type === 'JSXAttribute') return;
        const next = typeset(path.node.value);
        if (next !== path.node.value) {
          path.node.value = next;
          delete path.node.extra;
        }
      },
      JSXText(path) {
        const original = path.node.value;
        if (!/[А-Яа-яЁё]/u.test(original)) return;
        const lines = original.replace(/\t/g, ' ').split(/\r\n|\n|\r/);
        const value = lines
          .map((line, i) => {
            if (i > 0) line = line.replace(/^ +/, '');
            if (i < lines.length - 1) line = line.replace(/ +$/, '');
            return line;
          })
          .filter(Boolean)
          .join(' ');
        path.replaceWith(t.jsxExpressionContainer(t.stringLiteral(typeset(value))));
      },
    },
  };
}
export function typographyJson() {
  return {
    name: 'debt-speaker-typography',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/speakers.json')) return null;
      const data = JSON.parse(code).map((speaker) => ({ ...speaker, role: typeset(speaker.role) }));
      return { code: JSON.stringify(data), map: null };
    },
  };
}
