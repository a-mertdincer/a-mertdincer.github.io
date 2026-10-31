// Builds the pdfmake document for cv-en.pdf from cv/cv.json.
// Plain black-on-white A4 with real text, so recruiters and ATS parsers can read it.
import { parseInline, isSafeUrl } from './cv-render.js';

const INK = '#111111';
const SOFT = '#555555';
const ACCENT = '#1f5f61';

const runs = (text) =>
  parseInline(text).map((t) => {
    if (t.kind === 'bold') return { text: t.text, bold: true };
    if (t.kind === 'code') return { text: t.text, color: ACCENT };
    if (t.kind === 'link') return { text: t.text, link: t.url, color: ACCENT };
    return { text: t.text };
  });

const heading = (title) => ({
  stack: [
    { text: String(title).toUpperCase(), bold: true, fontSize: 10.5, characterSpacing: 0.8, color: ACCENT },
    { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 505, y2: 2, lineWidth: 0.6, lineColor: ACCENT }] },
  ],
  margin: [0, 10, 0, 4],
  headlineLevel: 1,
});

const bulletList = (items) => ({
  ul: items.map((i) => ({ text: runs(i), margin: [0, 0, 0, 2] })),
  markerColor: SOFT,
});

function entry(e) {
  const title = [{ text: e.title, bold: true }];
  if (e.org) title.push({ text: ' — ' }, { text: e.org, color: ACCENT });
  const stack = [{
    columns: [
      { text: title, width: '*' },
      { text: e.date ?? '', width: 'auto', color: SOFT, fontSize: 9, alignment: 'right', margin: [8, 0.5, 0, 0] },
    ],
  }];
  if (e.meta) stack.push({ text: e.meta, italics: true, color: SOFT, fontSize: 9, margin: [0, 1, 0, 0] });
  if (e.bullets?.length) stack.push({ ...bulletList(e.bullets), margin: [0, 3, 0, 0] });
  return { stack, margin: [0, 0, 0, 7], unbreakable: true };
}

function section(s) {
  const out = s.title ? [heading(s.title)] : [];
  if (s.type === 'text') {
    String(s.body ?? '').split(/\n\s*\n/).filter((p) => p.trim()).forEach((p) => {
      out.push({ text: runs(p.trim()), margin: [0, 0, 0, 4] });
    });
  } else if (s.type === 'entries') {
    (s.items ?? []).forEach((e) => out.push(entry(e)));
  } else if (s.type === 'lines') {
    (s.items ?? []).forEach((i) => out.push({ text: runs(i), margin: [0, 0, 0, 2] }));
  } else if (s.items?.length) {
    out.push(bulletList(s.items));
  }
  return out;
}

function contactLine(cv) {
  const parts = [];
  const push = (node) => {
    if (parts.length) parts.push({ text: '  ·  ', color: SOFT });
    parts.push(node);
  };
  if (cv.location) push({ text: cv.location });
  if (cv.email) push({ text: cv.email, link: `mailto:${cv.email}` });
  if (cv.phone) push({ text: cv.phone });
  (cv.links ?? []).filter((l) => isSafeUrl(l.url)).forEach((l) => push({ text: l.label || l.url, link: l.url }));
  return parts;
}

export function buildPdfDoc(cv) {
  const content = [
    { text: cv.name, fontSize: 20, bold: true, margin: [0, 0, 0, 3] },
    { text: contactLine(cv), fontSize: 9, color: INK, lineHeight: 1.25 },
  ];
  if (cv.targetRoles) {
    content.push({
      text: [{ text: 'Target Roles: ', bold: true }, { text: cv.targetRoles }],
      fontSize: 9.5,
      margin: [0, 5, 0, 0],
    });
  }
  (cv.sections ?? []).forEach((s) => content.push(...section(s)));
  return {
    pageSize: 'A4',
    pageMargins: [45, 34, 45, 34],
    info: { title: `CV - ${cv.name}`, author: cv.name },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9.5,
      color: INK,
      lineHeight: 1.16,
      // With ligatures, text extraction drops "fi" and "fl" ("Certified" reads as "Certifed"), which hurts ATS parsing.
      fontFeatures: { liga: false, clig: false },
    },
    // A section heading must not stay alone at the bottom of a page.
    pageBreakBefore: (node, following) => node.headlineLevel === 1 && following.length === 0,
    content,
  };
}
