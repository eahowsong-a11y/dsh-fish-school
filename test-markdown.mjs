// Unit test for the preview's Markdown renderer.
// Slices the renderer section out of client.js and runs it with a fake React
// createElement, so no browser is needed.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
const start = source.indexOf('// ===== Markdown rendering');
const end = source.indexOf('// Preview Modal Component');
if (start < 0 || end < 0 || end <= start) throw new Error('cannot locate the markdown section in client.js');
const section = source.slice(start, end);

const h = (type, props, ...children) => ({
  type,
  props: props ?? {},
  children: children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false),
});
const { mdRender, mdLooksLike, isMarkdownItem, mdSafeUrl } = new Function('h', 'useEffect', 'document',
  section + '\nreturn { mdRender, mdLooksLike, isMarkdownItem, mdSafeUrl };')(h, () => {}, { getElementById: () => null });

const checks = [];
const ok = (name, cond, detail = '') => {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const text = nodes => nodes.map(n => {
  if (typeof n === 'string') return n;
  return (n.children ?? []).map(c => typeof c === 'string' ? c : text([c])).join('');
}).join('');
const walk = (nodes, out = []) => {
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    out.push(n);
    walk(n.children ?? [], out);
  }
  return out;
};

// headings, emphasis, inline code
{
  const nodes = mdRender('# Title\n\nA **bold**, *italic* and `code` line.');
  const h1 = nodes.find(n => n.type === 'h1');
  ok('heading rendered', h1 && text([h1]) === 'Title', JSON.stringify(h1?.type));
  const all = walk(nodes);
  ok('bold rendered', all.some(n => n.type === 'strong'));
  ok('italic rendered', all.some(n => n.type === 'em'));
  ok('inline code rendered', all.some(n => n.type === 'code' && text([n]) === 'code'));
  ok('paragraph is not raw source', !text(nodes).includes('**bold**'), text(nodes));
}

// fenced code keeps content verbatim
{
  const nodes = mdRender('```js\nconst a = 1;\n```');
  const pre = nodes.find(n => n.type === 'pre');
  ok('fenced code block rendered', pre && text([pre]).includes('const a = 1;'));
}

// lists + nesting
{
  const nodes = mdRender('- one\n- two\n  - two-a\n- three');
  const ul = nodes.find(n => n.type === 'ul');
  const lis = ul?.children ?? [];
  ok('list rendered with 3 items', lis.length === 3, String(lis.length));
  ok('nested list attached', lis[1] && walk(lis[1].children ?? []).some(n => n.type === 'ul'));
  ok('list text', text([ul]).replace(/\s+/g, '') === 'onetwotwo-athree', text([ul]));
}

// table
{
  const nodes = mdRender('| A | B |\n| --- | :---: |\n| 1 | 2 |');
  const wrap = nodes.find(n => n.props?.className === 'fs-md-tablewrap');
  const table = wrap && walk([wrap]).find(n => n.type === 'table');
  ok('table rendered', Boolean(table));
  ok('table header cells', walk(wrap ? [wrap] : []).filter(n => n.type === 'th').length === 2);
  ok('table body cells', walk(wrap ? [wrap] : []).filter(n => n.type === 'td').length === 2);
}

// blockquote + rule + links + image
{
  const nodes = mdRender('> quoted\n\n---\n\n[link](https://example.com) ![pic](https://example.com/a.png)');
  ok('blockquote rendered', nodes.some(n => n.type === 'blockquote'));
  ok('rule rendered', nodes.some(n => n.type === 'hr'));
  const all = walk(nodes);
  ok('link target kept', all.some(n => n.type === 'a' && n.props.href === 'https://example.com'));
  ok('image kept', all.some(n => n.type === 'img' && n.props.src === 'https://example.com/a.png'));
}

// bold+italic combo and fence info strings
{
  const nodes = mdRender('***both***\n\n```ts title="x"\nlet a = 1;\n```');
  const all = walk(nodes);
  ok('bold+italic combo', all.some(n => n.type === 'strong' && n.children.some(c => c.type === 'em')));
  const code = all.find(n => n.type === 'code');
  ok('fence info string consumed', code && code.props.className === 'language-ts' && text([code]) === 'let a = 1;',
    JSON.stringify(code?.props));
}

// frontmatter is skipped, content still renders
{
  const nodes = mdRender('---\ntitle: 测试\ntags: [a, b]\n---\n\n# Body\n\ntext');
  ok('frontmatter skipped', !text(nodes).includes('title:'), text(nodes));
  ok('frontmatter body rendered', nodes.some(n => n.type === 'h1'));
}

// a pipe paragraph whose next line is not a valid delimiter stays a paragraph
{
  const nodes = mdRender('a | b\n---');
  ok('pipe paragraph not a table', !nodes.some(n => n.props?.className === 'fs-md-tablewrap'));
}

// unsafe hrefs are dropped, unsafe markdown escaped
{
  ok('javascript: link dropped', mdSafeUrl('javascript:alert(1)') === '');
  ok('data: image dropped', mdSafeUrl('data:text/html;base64,xx') === '');
  const nodes = mdRender('[x](javascript:alert(1))');
  const all = walk(nodes);
  ok('no unsafe anchor', !all.some(n => n.type === 'a'), JSON.stringify(all.map(n => n.type)));
}

// soft line breaks preserved inside a paragraph
{
  const nodes = mdRender('line one\nline two\n\nnext para');
  ok('two paragraphs', nodes.filter(n => n.type === 'p').length === 2);
  ok('line break kept', text(nodes).includes('line one\nline two'), JSON.stringify(text(nodes)));
}

// detection
{
  ok('md extension detected', isMarkdownItem({ name: 'README.md', type: 'file' }, {}));
  ok('windows md path detected', isMarkdownItem({ path: 'C:\\harper\\docs\\a.MD', type: 'file' }, {}));
  ok('conversation never markdown', !isMarkdownItem({ type: 'conversation', name: 'x.md' }, { content: '# h' }));
  ok('content sniff detects md', isMarkdownItem({ type: 'file', name: 'notes.txt' }, { content: '# Title\n\n- a\n- b' }));
  ok('plain text not md', !mdLooksLike('hello world\nsecond line'));
  ok('code not md', !mdLooksLike('function f() {\n  return 1;\n}'));
  ok('python comments not md', !mdLooksLike('# a comment\n# another comment\nimport os'));
  ok('md with heading and list detected', mdLooksLike('# Title\n\n- a\n- b'));
}

const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) { console.error('FAILED:', failed.map(f => f.name).join(' | ')); process.exit(1); }
