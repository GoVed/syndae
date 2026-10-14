/**
 * Interactive Markdown Table Resizer & Controller for Syndae UI.
 * Provides draggable column resizing, copy table, reset, and full-width toggle.
 */

export function tableElementToMarkdown(table: HTMLTableElement): string {
  const headers: string[] = [];
  const thEls = table.querySelectorAll('thead th');
  thEls.forEach(th => {
    const clone = th.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.table-col-resizer').forEach(el => el.remove());
    headers.push(clone.textContent?.trim() || '');
  });

  const rows: string[][] = [];
  const trEls = table.querySelectorAll('tbody tr');
  trEls.forEach(tr => {
    const rowCells: string[] = [];
    tr.querySelectorAll('td').forEach(td => {
      rowCells.push(td.textContent?.trim().replace(/\n/g, ' ') || '');
    });
    if (rowCells.length > 0) {
      rows.push(rowCells);
    }
  });

  if (headers.length === 0 && rows.length === 0) return '';

  const colCount = Math.max(headers.length, ...rows.map(r => r.length));
  const normalizedHeaders = Array.from({ length: colCount }, (_, i) => headers[i] || `Col ${i + 1}`);

  let md = '| ' + normalizedHeaders.join(' | ') + ' |\n';
  md += '| ' + normalizedHeaders.map(() => '---').join(' | ') + ' |\n';
  rows.forEach(r => {
    const padded = Array.from({ length: colCount }, (_, i) => r[i] || '');
    md += '| ' + padded.join(' | ') + ' |\n';
  });
  return md;
}

export function renderInteractiveTable(header: string, body: string): string {
  const enhancedHeader = header.replace(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi, (_match, attrs, content) => {
    return `<th${attrs} class="relative group/th select-text px-3 py-2 text-left font-semibold text-slate-100 bg-syndae-900 border border-syndae-700/80">
      <div class="flex items-center justify-between gap-2 overflow-hidden">
        <span class="truncate">${content}</span>
      </div>
      <div class="table-col-resizer absolute top-0 right-0 w-2.5 h-full cursor-col-resize select-none touch-none hover:bg-emerald-500/70 active:bg-emerald-400 transition-colors z-20" title="Drag to adjust column width (double-click to reset)"></div>
    </th>`;
  });

  const enhancedBody = body.replace(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi, (_match, attrs, content) => {
    return `<td${attrs} class="px-3 py-2 text-slate-200 border border-syndae-800/80 select-text break-words">${content}</td>`;
  });

  return `<div class="interactive-table-container my-3 rounded-xl border border-syndae-700/80 bg-syndae-950/85 shadow-md overflow-hidden select-text">
    <div class="table-toolbar flex items-center justify-between px-3 py-1.5 bg-syndae-900/95 border-b border-syndae-800 text-[11px] font-mono text-slate-400 select-none">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-emerald-400 shrink-0">📊</span>
        <span class="font-medium text-slate-200 truncate">Table</span>
        <span class="text-[10px] text-slate-500 hidden sm:inline">(drag edge to resize)</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="table-copy-btn px-2 py-0.5 rounded bg-syndae-800 hover:bg-syndae-700 active:bg-emerald-600 text-slate-300 hover:text-white transition-colors text-[10px] flex items-center gap-1 cursor-pointer" title="Copy table as Markdown">
          <span>📋</span><span>Copy</span>
        </button>
        <button type="button" class="table-reset-btn px-2 py-0.5 rounded bg-syndae-800 hover:bg-syndae-700 active:bg-emerald-600 text-slate-300 hover:text-white transition-colors text-[10px] cursor-pointer" title="Reset column widths">
          <span>↺ Reset</span>
        </button>
        <button type="button" class="table-expand-btn px-2 py-0.5 rounded bg-syndae-800 hover:bg-syndae-700 active:bg-emerald-600 text-slate-300 hover:text-white transition-colors text-[10px] cursor-pointer" title="Toggle full / scroll width">
          <span>↔ Width</span>
        </button>
      </div>
    </div>
    <div class="table-scroll-wrapper overflow-x-auto max-w-full p-0">
      <table class="interactive-table w-full border-collapse text-xs select-text" style="table-layout: auto;">
        <thead>${enhancedHeader}</thead>
        <tbody class="divide-y divide-syndae-800/60">${enhancedBody}</tbody>
      </table>
    </div>
  </div>`;
}

let tableInteractionsInitialized = false;

export function initTableInteractions(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (tableInteractionsInitialized) return;
  tableInteractionsInitialized = true;

  // 1. Column drag resizing state
  let activeTh: HTMLTableCellElement | null = null;
  let activeTable: HTMLTableElement | null = null;
  let startX = 0;
  let startWidth = 0;
  let startTableWidth = 0;

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    if (!activeTh || !activeTable) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const delta = clientX - startX;
    const newWidth = Math.max(45, startWidth + delta);
    activeTh.style.width = `${newWidth}px`;
    activeTh.style.minWidth = `${newWidth}px`;
    if (startTableWidth > 0) {
      const newTableWidth = Math.max(startTableWidth, startTableWidth + (newWidth - startWidth));
      activeTable.style.width = `${newTableWidth}px`;
      activeTable.style.minWidth = `${newTableWidth}px`;
    }
  };

  const onPointerUp = () => {
    if (activeTh) {
      activeTh.classList.remove('resizing');
      document.body.classList.remove('table-resizing');
      activeTh = null;
      activeTable = null;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
    }
  };

  document.addEventListener('mousedown', (e) => {
    const resizer = (e.target as HTMLElement).closest('.table-col-resizer');
    if (!resizer) return;
    e.preventDefault();
    e.stopPropagation();

    const th = resizer.closest('th');
    if (!th) return;
    const table = th.closest('table');
    if (!table) return;

    activeTh = th;
    activeTable = table;
    startX = e.clientX;
    startWidth = th.offsetWidth;
    startTableWidth = table.offsetWidth;

    if (table.style.tableLayout !== 'fixed') {
      const allTh = table.querySelectorAll('thead th');
      allTh.forEach(item => {
        const el = item as HTMLTableCellElement;
        el.style.width = `${el.offsetWidth}px`;
        el.style.minWidth = `${el.offsetWidth}px`;
      });
      table.style.tableLayout = 'fixed';
    }

    th.classList.add('resizing');
    document.body.classList.add('table-resizing');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
  });

  document.addEventListener('touchstart', (e) => {
    const resizer = (e.target as HTMLElement).closest('.table-col-resizer');
    if (!resizer) return;
    const th = resizer.closest('th');
    if (!th) return;
    const table = th.closest('table');
    if (!table) return;

    activeTh = th;
    activeTable = table;
    startX = e.touches[0].clientX;
    startWidth = th.offsetWidth;
    startTableWidth = table.offsetWidth;

    if (table.style.tableLayout !== 'fixed') {
      const allTh = table.querySelectorAll('thead th');
      allTh.forEach(item => {
        const el = item as HTMLTableCellElement;
        el.style.width = `${el.offsetWidth}px`;
        el.style.minWidth = `${el.offsetWidth}px`;
      });
      table.style.tableLayout = 'fixed';
    }

    th.classList.add('resizing');
    document.body.classList.add('table-resizing');
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }, { passive: false });

  // Double click on resizer resets column
  document.addEventListener('dblclick', (e) => {
    const resizer = (e.target as HTMLElement).closest('.table-col-resizer');
    if (!resizer) return;
    const th = resizer.closest('th');
    if (th) {
      th.style.width = '';
      th.style.minWidth = '';
    }
  });

  // 2. Toolbar & Link action handlers via event delegation
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Table Copy button
    const copyBtn = target.closest('.table-copy-btn') as HTMLElement;
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const container = copyBtn.closest('.interactive-table-container');
      const table = container?.querySelector('table') as HTMLTableElement | null;
      if (table && navigator.clipboard) {
        const md = tableElementToMarkdown(table);
        navigator.clipboard.writeText(md);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>✅</span><span>Copied!</span>';
        copyBtn.classList.add('text-emerald-400');
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('text-emerald-400');
        }, 1500);
      }
      return;
    }

    // Table Reset button
    const resetBtn = target.closest('.table-reset-btn') as HTMLElement;
    if (resetBtn) {
      e.preventDefault();
      e.stopPropagation();
      const container = resetBtn.closest('.interactive-table-container');
      const table = container?.querySelector('table');
      if (table) {
        table.style.tableLayout = 'auto';
        table.querySelectorAll('th').forEach(th => {
          th.style.width = '';
          th.style.minWidth = '';
        });
        const scrollWrapper = container?.querySelector('.table-scroll-wrapper') as HTMLElement | null;
        if (scrollWrapper) {
          scrollWrapper.style.minWidth = '';
        }
      }
      return;
    }

    // Table Expand / Width toggle button
    const expandBtn = target.closest('.table-expand-btn') as HTMLElement;
    if (expandBtn) {
      e.preventDefault();
      e.stopPropagation();
      const container = expandBtn.closest('.interactive-table-container');
      const table = container?.querySelector('table');
      const scrollWrapper = container?.querySelector('.table-scroll-wrapper') as HTMLElement | null;
      if (table && scrollWrapper) {
        if (scrollWrapper.style.minWidth) {
          scrollWrapper.style.minWidth = '';
          table.style.minWidth = '';
          expandBtn.classList.remove('text-emerald-400');
        } else {
          scrollWrapper.style.minWidth = '800px';
          table.style.minWidth = '800px';
          expandBtn.classList.add('text-emerald-400');
        }
      }
      return;
    }

    // Link Copy button
    const copyUrlBtn = target.closest('.copy-url-btn') as HTMLElement;
    if (copyUrlBtn) {
      e.preventDefault();
      e.stopPropagation();
      const url = copyUrlBtn.getAttribute('data-url');
      if (url && navigator.clipboard) {
        navigator.clipboard.writeText(url);
        copyUrlBtn.classList.add('text-emerald-400');
        setTimeout(() => copyUrlBtn.classList.remove('text-emerald-400'), 1500);
      }
      return;
    }

    // Global Link Click handler (ensures clicking any URL navigates reliably)
    const anchor = target.closest('a');
    if (anchor) {
      // If user is actively highlighting/selecting text, do not navigate
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        return;
      }
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  });
}

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
  initTableInteractions();
}
