import { marked } from 'marked';

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

      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr} class="text-emerald-400 hover:underline">${text}</a>`;
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
