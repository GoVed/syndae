import { marked } from 'marked';
import { renderInteractiveTable } from './tableResizer';

export const resolveImageUrl = (img: string): string => {
  if (!img || typeof img !== 'string') return '';
  if (img.startsWith('data:')) {
    return img;
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('syndae_access_key') : null;
  const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';

  if (
    img.startsWith('http://localhost') ||
    img.startsWith('http://127.0.0.1') ||
    img.startsWith('http://host.docker.internal') ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:' && img.startsWith('http://'))
  ) {
    const base = `/api/tools/media?url=${encodeURIComponent(img)}`;
    return tokenParam ? `${base}&${tokenParam}` : base;
  }
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }
  if (img.startsWith('/')) {
    if (tokenParam && (img.startsWith('/api/memory/raw') || img.startsWith('/api/tools/media')) && !img.includes('token=')) {
      const sep = img.includes('?') ? '&' : '?';
      return `${img}${sep}${tokenParam}`;
    }
    return img;
  }
  const base = `/api/memory/raw?path=${encodeURIComponent(img)}`;
  return tokenParam ? `${base}?${tokenParam}` : base;
};

export const isImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean.startsWith('data:image/')) return true;
  if (clean.includes('/api/memory/raw')) return true;
  if (clean.includes('/api/tools/media')) return true;

  if (/\.(jpeg|jpg|png|webp|gif|svg|avif|bmp)(?:[?#].*)?$/i.test(clean)) {
    return true;
  }

  if (
    clean.includes('images.unsplash.com/') ||
    clean.includes('images.pexels.com/') ||
    clean.includes('cdn.pixabay.com/') ||
    clean.includes('i.imgur.com/') ||
    clean.includes('i.redd.it/') ||
    clean.includes('upload.wikimedia.org/')
  ) {
    return true;
  }

  return false;
};

export const formatShortUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let path = parsed.pathname;
    if (path === '/' || path === '') {
      return host;
    }
    path = path.replace(/\/$/, '');
    if (path.length > 20) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0) {
        path = '/' + parts[0];
      }
    }
    const combined = host + path;
    if (combined.length > 34) {
      return combined.slice(0, 32) + '…';
    }
    return combined;
  } catch {
    return url.length > 34 ? url.slice(0, 32) + '…' : url;
  }
};

const escapeAttr = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeJs = (str: string): string =>
  str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');

marked.setOptions({
  breaks: true,
  gfm: true,
});

marked.use({
  renderer: {
    link({ href, title, text }: { href: string; title?: string | null; text: string }) {
      if (href && href.startsWith('file://')) {
        const cleanPath = href.replace(/^file:\/\//, '');
        return `<code class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-syndae-900 text-emerald-400 border border-syndae-700 select-all inline-block" title="Local file: ${cleanPath}">${text || cleanPath}</code>`;
      }

      if (isImageUrl(href)) {
        const resolvedHref = resolveImageUrl(href);
        const isGeneric = (str?: string | null) => !str || /^(image|image preview|photo|picture)$/i.test(str.trim()) || str.trim() === href.trim();
        const caption = !isGeneric(text) ? text : (!isGeneric(title) ? (title || '') : '');
        return `<div class="my-2.5 max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-lg bg-syndae-950/80 group image-card-box">
  <div class="relative overflow-hidden max-h-80 flex items-center justify-center bg-black/40">
    <img src="${resolvedHref}" alt="${caption}" class="w-full h-auto max-h-80 object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" onerror="const b = this.closest('.image-card-box'); if (b) { b.outerHTML = '<div class=\\'my-2 p-2.5 rounded-xl bg-syndae-900 border border-syndae-800 text-xs text-slate-400 flex items-center justify-between gap-3\\'><span>⚠️ Image link unavailable</span><a href=\\'${resolvedHref}\\' target=\\'_blank\\' rel=\\'noopener noreferrer\\' class=\\'text-emerald-400 hover:underline text-[11px] font-mono truncate max-w-[240px]\\'>${caption || text || resolvedHref} ↗</a></div>'; }" />
  </div>
  ${caption ? `<div class="px-3 py-1.5 text-xs text-slate-300 bg-syndae-900/90 border-t border-white/5 flex items-center justify-between"><span>${caption}</span><a href="${resolvedHref}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline">Open ↗</a></div>` : ''}
</div>`;
      }

      const rawHref = href || '';
      const rawText = text || '';
      const isUrlText = /^https?:\/\//i.test(rawText.trim()) || rawText.trim() === rawHref.trim() || (rawText.length > 35 && (rawText.includes('?') || rawText.includes('=')));
      const isLinkRef = /^(?:\[)?Link\s*#\d+/i.test(rawText.trim());

      const escapedHref = escapeAttr(rawHref);
      const escapedJs = escapeJs(rawHref);
      const fullTooltip = title ? `${title} (${rawHref})` : rawHref;
      const escapedTitle = escapeAttr(fullTooltip);

      if (isUrlText || isLinkRef) {
        const displayLabel = isUrlText
          ? formatShortUrl(rawHref || rawText)
          : rawText.trim().replace(/^\[|\]$/g, '');

        return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-lg bg-syndae-900 border border-syndae-700/70 text-xs font-mono group/url select-text align-middle max-w-full">
  <a href="${escapedHref}" target="_blank" rel="noopener noreferrer" title="${escapedTitle}" class="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 min-w-0 max-w-[260px] sm:max-w-[340px] truncate cursor-pointer pointer-events-auto select-text">
    <span class="truncate pointer-events-none">${displayLabel}</span>
    <span class="text-[10px] opacity-70 group-hover/url:opacity-100 shrink-0 pointer-events-none">↗</span>
  </a>
  <button type="button" title="Copy full URL" data-url="${escapedHref}" class="copy-url-btn text-slate-400 hover:text-slate-200 text-[10px] p-0.5 transition-colors focus:outline-none shrink-0 cursor-pointer pointer-events-auto" aria-label="Copy URL">
    <svg class="w-3 h-3 copy-icon pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
  </button>
</span>`;
      }

      return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" title="${escapedTitle}" class="text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer pointer-events-auto select-text">${rawText}<span class="text-[10px] opacity-70 pointer-events-none">↗</span></a>`;
    },
    table(this: any, token: any) {
      let headerCells = '';
      if (token && Array.isArray(token.header)) {
        for (let j = 0; j < token.header.length; j++) {
          const cell = token.header[j];
          const content = this.parser.parseInline(cell.tokens || []);
          const alignAttr = cell.align ? ` align="${cell.align}"` : '';
          headerCells += `<th${alignAttr}>${content}</th>`;
        }
      }
      const headerHtml = `<tr>${headerCells}</tr>`;

      let bodyHtml = '';
      if (token && Array.isArray(token.rows)) {
        for (let j = 0; j < token.rows.length; j++) {
          const row = token.rows[j];
          let rowCells = '';
          for (let k = 0; k < row.length; k++) {
            const cell = row[k];
            const content = this.parser.parseInline(cell.tokens || []);
            const alignAttr = cell.align ? ` align="${cell.align}"` : '';
            rowCells += `<td${alignAttr}>${content}</td>`;
          }
          bodyHtml += `<tr>${rowCells}</tr>`;
        }
      }

      return renderInteractiveTable(headerHtml, bodyHtml);
    },
    image({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const resolvedHref = resolveImageUrl(href);
      const isGeneric = (str?: string | null) => !str || /^(image|image preview|photo|picture)$/i.test(str.trim()) || str.trim() === href.trim();
      const caption = !isGeneric(text) ? text : (!isGeneric(title) ? (title || '') : '');
      return `<div class="my-2.5 max-w-xl rounded-xl overflow-hidden border border-white/10 shadow-lg bg-syndae-950/80 group image-card-box">
  <div class="relative overflow-hidden max-h-80 flex items-center justify-center bg-black/40">
    <img src="${resolvedHref}" alt="${caption}" class="w-full h-auto max-h-80 object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" onerror="const b = this.closest('.image-card-box'); if (b) { b.outerHTML = '<div class=\\'my-2 p-2.5 rounded-xl bg-syndae-900 border border-syndae-800 text-xs text-slate-400 flex items-center justify-between gap-3\\'><span>⚠️ Image unavailable</span><a href=\\'${resolvedHref}\\' target=\\'_blank\\' rel=\\'noopener noreferrer\\' class=\\'text-emerald-400 hover:underline text-[11px] font-mono truncate max-w-[240px]\\'>${caption || text || resolvedHref} ↗</a></div>'; }" />
  </div>
  ${caption ? `<div class="px-3 py-1.5 text-xs text-slate-300 bg-syndae-900/90 border-t border-white/5 flex items-center justify-between"><span>${caption}</span><a href="${resolvedHref}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-emerald-400 hover:underline">Open ↗</a></div>` : ''}
</div>`;
    },
  },
});

export const renderMarkdown = (content: string): string => {
  if (!content) return '';
  try {
    return marked.parse(content) as string;
  } catch (e) {
    return content;
  }
};
