// ==UserScript==
// @name         Bearbit Cover (lite)
// @namespace    kitti.local
// @version      0.2.0
// @description  หน้าปก, รูปใหญ่, อัลบั้ม, ปุ่มขยาย, สีเทาเมื่อโหลดแล้ว ฯลฯ — เขียนใหม่จาก concept ของ cover-next
// @homepageURL  https://github.com/kitti332/bearbit-cover
// @updateURL    https://raw.githubusercontent.com/kitti332/bearbit-cover/main/bearbit-cover.user.js
// @downloadURL  https://raw.githubusercontent.com/kitti332/bearbit-cover/main/bearbit-cover.user.js
// @match        https://www.bearbit.org
// @match        https://www.bearbit.org/index.php*
// @match        https://www.bearbit.org/viewno18.php*
// @match        https://www.bearbit.org/viewbr.php*
// @match        https://www.bearbit.org/viewno18sb.php*
// @match        https://www.bearbit.org/viewno18sbx.php*
// @match        https://www.bearbit.org/viewbrsb.php*
// @match        https://www.bearbit.org/torrent_day.php*
// @match        https://www.bearbit.org/torrent_week.php*
// @match        https://www.bearbit.org/torrent_month.php*
// @match        https://www.bearbit.org/upfinish.php*
// @match        https://www.bearbit.org/downfinish.php*
// @match        https://www.bearbit.org/details.php*
// @match        https://bearbit.org
// @match        https://bearbit.org/index.php*
// @match        https://bearbit.org/viewno18.php*
// @match        https://bearbit.org/viewbr.php*
// @match        https://bearbit.org/viewno18sb.php*
// @match        https://bearbit.org/viewno18sbx.php*
// @match        https://bearbit.org/viewbrsb.php*
// @match        https://bearbit.org/torrent_day.php*
// @match        https://bearbit.org/torrent_week.php*
// @match        https://bearbit.org/torrent_month.php*
// @match        https://bearbit.org/upfinish.php*
// @match        https://bearbit.org/downfinish.php*
// @match        https://bearbit.org/details.php*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(() => {
  'use strict';

  // =====================================================================
  // settings — ค่าเริ่มต้นตามที่ตั้งไว้ใน cover-next เดิม
  // =====================================================================
  const OPTIONS = [
    ['preview',         true,  'หน้าปก (คอลัมน์รูป)'],
    ['previewHover',    true,  'แสดงรูปใหญ่ เมื่อชี้ที่หน้าปก'],
    ['titleHover',      true,  'แสดงรูปใหญ่ เมื่อชี้ที่ชื่อรายการ'],
    ['expandButton',    true,  'ปุ่มขยายใต้รายการ'],
    ['album',           true,  'อัลบั้ม (คลิกที่รูปปก)'],
    ['markDownloaded',  true,  'ชื่อสีเทาถ้าโหลดแล้ว'],
    ['downloadHistory', true,  'ดึงประวัติโหลดย้อนหลัง (downfinish)'],
    ['autoThankDetail', true,  'ขอบคุณอัตโนมัติ (หน้ารายละเอียด)'],
    ['autoReadLetter',  true,  'อ่านจดหมาย แจ้งเพื่อทราบ/เกมส์ อัตโนมัติ'],
    ['cleanBookmarks',  true,  'ซ่อน Bookmarks (หน้ารายละเอียด)'],
    ['cleanPromote',    true,  'ซ่อน Promote this Item (หน้ารายละเอียด)'],
    ['debug',           false, 'debug log'],
  ];
  const cfg = Object.fromEntries(OPTIONS.map(([k, d]) => [k, d]));
  Object.assign(cfg, GM_getValue('settings', {}));
  const log = (...a) => cfg.debug && console.log('[bb-cover]', ...a);

  for (const [key, , label] of OPTIONS) {
    GM_registerMenuCommand(`${cfg[key] ? '✅' : '⬜'} ${label}`, () => {
      cfg[key] = !cfg[key];
      GM_setValue('settings', cfg);
      location.reload();
    });
  }
  GM_registerMenuCommand('🗑 ล้าง cache รูป', () => { store.write('details', {}); location.reload(); });
  GM_registerMenuCommand('🔄 ดึงประวัติโหลดใหม่ทั้งหมด', () => {
    store.write('history', { at: 0, complete: false });
    location.reload();
  });

  // =====================================================================
  // storage — localStorage อาจถูกบล็อก → ห้ามทำให้ทั้งสคริปต์พัง
  // =====================================================================
  const PREFIX = 'bbcover:';
  const store = {
    read(name, fallback) {
      try { return JSON.parse(localStorage.getItem(PREFIX + name)) ?? fallback; } catch { return fallback; }
    },
    write(name, value) {
      try { localStorage.setItem(PREFIX + name, JSON.stringify(value)); } catch (e) { log('store write failed', e); }
    },
  };

  const downloaded = new Set(store.read('downloaded', []));
  const saveDownloaded = () => store.write('downloaded', [...downloaded]);
  const markAsDownloaded = (id) => {
    if (downloaded.has(id)) return;
    downloaded.add(id);
    saveDownloaded();
  };

  // =====================================================================
  // helpers
  // =====================================================================
  const idFromHref = (href) => {
    const m = /[?&]id=(\d+)/.exec(href || '');
    return m ? m[1] : null; // cover-next เดิมพังตรงนี้ (เรียก [1] บน null)
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  // จำกัด request พร้อมกัน ไม่ยิงเว็บรัว
  const limit = (max) => {
    let active = 0;
    const queue = [];
    const next = () => {
      if (active >= max || !queue.length) return;
      active++;
      const { fn, resolve, reject } = queue.shift();
      fn().then(resolve, reject).finally(() => { active--; next(); });
    };
    return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
  };
  const queued = limit(3);

  // เว็บส่ง TIS-620 → ต้อง decode เอง ไม่งั้นข้อความไทยเพี้ยน
  const fetchDoc = async (url) => {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || '';
    let charset = /charset=([\w-]+)/i.exec(ct)?.[1];
    if (!charset) {
      const head = new TextDecoder('ascii').decode(buf.slice(0, 2048));
      charset = /charset=["']?([\w-]+)/i.exec(head)?.[1] || 'windows-874';
    }
    if (/tis-?620|874/i.test(charset)) charset = 'windows-874';
    let text;
    try { text = new TextDecoder(charset).decode(buf); } catch { text = new TextDecoder('windows-874').decode(buf); }
    return new DOMParser().parseFromString(text, 'text/html');
  };

  const IMG_EXT = /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i;

  // ลิงก์ ScreenShot ของเว็บมักเป็น "หน้า" ของฝากรูป (เช่น imgbb.ws/xxx) ไม่ใช่ไฟล์รูป
  // → เปิดหน้านั้นข้ามโดเมนด้วย GM_xmlhttpRequest แล้วอ่าน og:image
  const resolveImagePage = (url) => new Promise((resolve) => {
    if (IMG_EXT.test(url)) { resolve(url); return; }
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: 15000,
      onload: (r) => {
        const doc = new DOMParser().parseFromString(r.responseText || '', 'text/html');
        const og = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.content;
        const link = doc.querySelector('link[rel="image_src"]')?.href;
        resolve(og || link || null);
      },
      onerror: () => resolve(null),
      ontimeout: () => resolve(null),
    });
  });

  // =====================================================================
  // ข้อมูลจากหน้ารายละเอียด: ปก + รูปทั้งหมด (สำหรับอัลบั้ม/ปุ่มขยาย)
  // =====================================================================
  const DETAIL_TTL = 7 * 24 * 3600 * 1000;
  const detailCache = store.read('details', {});
  const inflight = new Map();

  const parseDetail = async (doc) => {
    const images = [];
    const add = (src) => {
      if (src && /^https?:/i.test(src) && !images.includes(src)) images.push(src);
    };
    // รูปในคำอธิบาย (.bb-descr) เป็นไฟล์รูปตรง ๆ
    doc.querySelectorAll('.bb-descr img').forEach((img) => add(img.getAttribute('src') || img.dataset.src));
    // แถว ScreenShot
    let shotPage = null;
    for (const th of doc.querySelectorAll('td.rowhead')) {
      if (th.textContent.trim().toLowerCase() !== 'screenshot') continue;
      const cell = th.nextElementSibling;
      cell?.querySelectorAll('img[src]').forEach((img) => add(img.getAttribute('src')));
      const href = cell?.querySelector('a[href^="http"]')?.getAttribute('href');
      if (href) IMG_EXT.test(href) ? add(href) : (shotPage = href);
    }
    if (shotPage) {
      const real = await resolveImagePage(shotPage);
      if (real) images.unshift(real); // ScreenShot ที่ผู้ลงตั้งไว้ = ปก
    }
    return { cover: images[0] || '', images: images.slice(0, 30) };
  };

  const getDetail = (id, url) => {
    const hit = detailCache[id];
    if (hit && Date.now() - hit.at < DETAIL_TTL) return Promise.resolve(hit);
    if (inflight.has(id)) return inflight.get(id);
    const p = queued(async () => {
      const info = { ...(await parseDetail(await fetchDoc(url))), at: Date.now() };
      detailCache[id] = info;
      store.write('details', detailCache);
      log('detail', id, info.images.length, 'images');
      return info;
    }).finally(() => inflight.delete(id));
    inflight.set(id, p);
    return p;
  };

  // =====================================================================
  // hover รูปใหญ่
  // =====================================================================
  let hoverImg = null;
  let hoverToken = 0;
  const showHover = (src, ev) => {
    if (!hoverImg) hoverImg = document.body.appendChild(el('img', { className: 'bbc-hover', referrerPolicy: 'no-referrer' }));
    hoverImg.onload = () => moveHover(ev); // ขนาดจริงมาแล้ว จัดตำแหน่งใหม่
    hoverImg.src = src;
    hoverImg.style.display = 'block';
    moveHover(ev);
  };
  const moveHover = (ev) => {
    if (!hoverImg || hoverImg.style.display === 'none') return;
    const pad = 16;
    const w = hoverImg.offsetWidth || 300;
    const h = hoverImg.offsetHeight || 400;
    let x = ev.clientX + pad;
    if (x + w > innerWidth) x = Math.max(pad, ev.clientX - w - pad);
    const y = Math.min(Math.max(pad, ev.clientY - h / 2), innerHeight - h - pad);
    hoverImg.style.left = `${x}px`;
    hoverImg.style.top = `${y}px`;
  };
  const hideHover = () => { hoverToken++; if (hoverImg) hoverImg.style.display = 'none'; };

  // getUrl อาจเป็น async (ต้องโหลดหน้ารายละเอียดก่อน) → ใช้ token กันรูปเด้งหลังเมาส์ออกไปแล้ว
  const attachHover = (target, getUrl) => {
    target.addEventListener('mouseenter', async (e) => {
      const token = ++hoverToken;
      const url = await getUrl();
      if (url && token === hoverToken) showHover(url, e);
    });
    target.addEventListener('mousemove', moveHover);
    target.addEventListener('mouseleave', hideHover);
  };

  // รูปย่อ images.weserv.nl ของเว็บ (w=200,h=280) → ขอขนาดใหญ่จาก proxy เดิม
  const enlarge = (src) => {
    try {
      const u = new URL(src, location.href);
      if (!/(^|\.)weserv\.nl$/.test(u.hostname)) return src;
      u.searchParams.set('w', '700');
      u.searchParams.set('h', '1000');
      return u.href;
    } catch { return src; }
  };

  // =====================================================================
  // อัลบั้ม (lightbox)
  // =====================================================================
  const openAlbum = (images, start = 0) => {
    if (!images.length) return;
    let i = start;
    const img = el('img', { className: 'bbc-album-img', referrerPolicy: 'no-referrer' });
    const counter = el('div', { className: 'bbc-album-count' });
    const show = () => { img.src = images[i]; counter.textContent = `${i + 1} / ${images.length}`; };
    const go = (d) => { i = (i + d + images.length) % images.length; show(); };
    const prev = el('button', { className: 'bbc-album-nav bbc-prev', textContent: '‹', onclick: (e) => { e.stopPropagation(); go(-1); } });
    const next = el('button', { className: 'bbc-album-nav bbc-next', textContent: '›', onclick: (e) => { e.stopPropagation(); go(1); } });
    const box = el('div', { className: 'bbc-album' }, img, counter, prev, next);
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    img.onclick = (e) => { e.stopPropagation(); go(1); };
    box.onclick = close;
    document.addEventListener('keydown', onKey, true);
    document.body.append(box);
    if (images.length < 2) { prev.remove(); next.remove(); }
    show();
  };

  // =====================================================================
  // หน้ารายการ
  // =====================================================================
  const parseRow = (tr) => {
    if (!tr.cells || tr.cells.length < 2) return null;
    // หาลิงก์ details จากทั้งแถว ไม่ผูกเลขคอลัมน์ (layout ใหม่มีคอลัมน์ "รูป" แทรกที่ index 1)
    const titleLink = tr.querySelector('a[href*="details.php"][href*="id="]');
    const id = idFromHref(titleLink?.getAttribute('href'));
    if (!id) return null; // แถวโฆษณา/คั่น → ข้าม
    const camLink = tr.querySelector('a > img[src*="cam"]')?.parentElement;
    const nativeImg = tr.querySelector('td.poster-column img');
    const nativeSrc = nativeImg?.getAttribute('src') || '';
    return {
      tr,
      id,
      titleLink,
      detailUrl: new URL(titleLink.getAttribute('href'), location.href).href,
      directCover: camLink?.getAttribute('href') || null,
      nativeImg: nativeImg && !/no_poster/i.test(nativeSrc) ? nativeImg : null,
      nativeCell: tr.querySelector('td.poster-column'),
      downloadLinks: [...tr.querySelectorAll('a[href*="download"]')],
    };
  };

  const detailOf = (row) => getDetail(row.id, row.detailUrl);

  // URL รูปใหญ่ของแถว: รูปเว็บ (ขยาย) > ลิงก์กล้อง > จากหน้ารายละเอียด
  const bigCoverOf = async (row) => {
    if (row.nativeImg) return enlarge(row.nativeImg.src);
    if (row.directCover) return row.directCover;
    try { return (await detailOf(row)).cover || null; } catch { return null; }
  };

  const albumOf = async (row) => {
    let images = [];
    try { images = [...(await detailOf(row)).images]; } catch (e) { log('album fail', e); }
    const big = row.nativeImg ? enlarge(row.nativeImg.src) : null;
    if (big && !images.length) images.push(big);
    return images;
  };

  const makeThumb = (url) => {
    const img = el('img', { className: 'bbc-thumb', loading: 'lazy', referrerPolicy: 'no-referrer', src: url });
    return img;
  };

  const wireCover = (img, row) => {
    if (cfg.previewHover) attachHover(img, () => bigCoverOf(row));
    if (cfg.album) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideHover();
        openAlbum(await albumOf(row));
      });
    }
  };

  // เซลล์ที่ต้องหาปกเอง (layout เก่า หรือเว็บขึ้น no_poster)
  const fillCell = async (td, row) => {
    td.textContent = '…';
    try {
      const url = row.directCover || (await detailOf(row)).cover;
      td.textContent = '';
      if (!url) { td.textContent = '-'; return; }
      const img = makeThumb(url);
      img.onerror = () => { td.textContent = '✕'; };
      wireCover(img, row);
      td.append(img);
    } catch (e) {
      td.textContent = '!';
      td.title = String(e);
      log('cell fail', row.id, e);
    }
  };

  const toggleExpand = async (row, btn) => {
    const existing = row.tr.nextElementSibling;
    if (existing?.classList.contains('bbc-expand-row')) {
      existing.remove();
      btn.textContent = '▾ ขยาย';
      return;
    }
    btn.textContent = '▴ ย่อ';
    const td = el('td', { colSpan: row.tr.cells.length, className: 'bbc-expand-cell', textContent: 'กำลังโหลด…' });
    row.tr.after(el('tr', { className: 'bbc-expand-row' }, td));
    const images = await albumOf(row);
    td.textContent = '';
    const bar = el('div', { className: 'bbc-expand-bar' },
      el('a', { href: row.detailUrl, target: '_blank', textContent: 'เปิดหน้ารายละเอียด' }));
    if (row.downloadLinks[0]) {
      bar.append(' · ', el('a', {
        href: row.downloadLinks[0].href,
        textContent: downloaded.has(row.id) ? 'ดาวน์โหลด (โหลดไปแล้ว)' : 'ดาวน์โหลด',
        onclick: () => markRow(row),
      }));
    }
    td.append(bar);
    if (!images.length) { td.append(el('div', { textContent: 'ไม่พบรูป' })); return; }
    const grid = el('div', { className: 'bbc-expand-grid' });
    images.forEach((src, i) => {
      const img = el('img', { src, loading: 'lazy', referrerPolicy: 'no-referrer' });
      img.onclick = () => openAlbum(images, i);
      grid.append(img);
    });
    td.append(grid);
  };

  const markRow = (row) => {
    markAsDownloaded(row.id);
    row.tr.classList.add('bbc-done');
  };

  const enhanceRow = (row, { observer, byCell, addColumn }) => {
    if (cfg.markDownloaded) {
      if (downloaded.has(row.id)) row.tr.classList.add('bbc-done');
      row.downloadLinks.forEach((a) => a.addEventListener('click', () => markRow(row)));
    }

    if (cfg.titleHover) attachHover(row.titleLink, () => bigCoverOf(row));

    if (cfg.expandButton) {
      const btn = el('a', { href: '#', className: 'bbc-expand-btn', textContent: '▾ ขยาย' });
      btn.addEventListener('click', (e) => { e.preventDefault(); toggleExpand(row, btn); });
      row.titleLink.closest('td').append(' ', btn);
    }

    if (!cfg.preview) return;
    if (row.nativeImg) {
      // ใช้รูปของเว็บ ปิด hover ของเว็บไม่ให้ซ้อน
      row.nativeImg.removeAttribute('onmouseover');
      row.nativeImg.removeAttribute('onmouseout');
      wireCover(row.nativeImg, row);
      return;
    }
    let td = row.nativeCell;
    if (!td && addColumn) {
      td = el('td', { className: 'bbc-cell' });
      row.tr.cells[0].after(td);
    }
    if (!td) return;
    td.textContent = '';
    byCell.set(td, row);
    observer.observe(td);
  };

  const findListTables = () => {
    const SIZE = ['ขนาด', 'ขนาดไฟล์', 'Size'];
    const SEED = ['ปล่อย', 'คนปล่อย', 'Seeder'];
    // เช็คทีละเซลล์ของแถวแรก (ไม่ใช่ textContent ทั้งแถว ไม่งั้นตาราง layout ที่ห่อข้างนอกจะ match)
    return [...document.querySelectorAll('table')].filter((t) => {
      const heads = [...(t.rows[0]?.cells || [])].map((c) => c.textContent.trim());
      return heads.some((h) => SIZE.includes(h)) && heads.some((h) => SEED.includes(h));
    });
  };

  const allRows = [];

  const runListPage = () => {
    const tables = findListTables(); // อาจมีหลายตาราง เช่น ปักหมุด + ตารางหลัก
    if (!tables.length) { log('no list table'); return; }

    const byCell = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        observer.unobserve(ent.target);
        fillCell(ent.target, byCell.get(ent.target));
      }
    }, { rootMargin: '400px' });

    for (const table of tables) {
      const hasNative = !!table.querySelector('td.poster-column');
      const addColumn = cfg.preview && !hasNative;
      if (cfg.preview && hasNative) {
        // เว็บซ่อนคอลัมน์รูปด้วย class บน <html> (ปุ่ม "แสดงรูปภาพ") → เปิดให้เสมอ
        document.documentElement.classList.remove('hide-posters-general');
      }
      const rows = [];
      for (const tr of [...table.rows].slice(1)) {
        const row = parseRow(tr);
        if (row) rows.push(row);
        else if (addColumn && tr.cells.length) tr.cells[tr.cells.length - 1].colSpan += 1;
      }
      if (addColumn) table.rows[0].cells[0].after(el('td', { className: 'colhead bbc-cell', textContent: 'ปก' }));
      rows.forEach((row) => enhanceRow(row, { observer, byCell, addColumn }));
      allRows.push(...rows);
      log('table rows', rows.length, hasNative ? '(native posters)' : '(+cover column)');
    }
  };

  const refreshDownloadedMarks = () => {
    if (!cfg.markDownloaded) return;
    allRows.forEach((row) => row.tr.classList.toggle('bbc-done', downloaded.has(row.id)));
  };

  // =====================================================================
  // ประวัติโหลดย้อนหลัง: downfinish.php?id=<ของเรา>&page=N (25 รายการ/หน้า)
  // ครั้งแรกดึงจนหมด (ไม่เกิน 100 หน้า) ครั้งต่อไปดึงเฉพาะหน้าแรก ๆ จนเจอ id ที่รู้แล้ว
  // =====================================================================
  const HISTORY_INTERVAL = 6 * 3600 * 1000;
  const MAX_HISTORY_PAGES = 100;

  const myUserId = () => idFromHref(document.querySelector('a[href*="userdetails.php?id="]')?.getAttribute('href'));

  const syncHistory = async () => {
    const state = store.read('history', { at: 0, complete: false });
    if (Date.now() - state.at < HISTORY_INTERVAL) return;
    const uid = myUserId();
    if (!uid) { log('history: no user id'); return; }
    // กันหลายแท็บดึงพร้อมกัน
    store.write('history', { ...state, at: Date.now() });

    let added = 0;
    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
      let doc;
      try { doc = await fetchDoc(`/downfinish.php?id=${uid}&page=${page}`); } catch (e) { log('history fail', page, e); return; }
      const ids = [...doc.querySelectorAll('a[href*="details.php"][href*="id="]')]
        .map((a) => idFromHref(a.getAttribute('href'))).filter(Boolean);
      if (!ids.length) { state.complete = true; break; }
      const fresh = ids.filter((id) => !downloaded.has(id));
      fresh.forEach((id) => downloaded.add(id));
      added += fresh.length;
      log('history page', page, ids.length, 'ids,', fresh.length, 'new');
      if (state.complete && !fresh.length) break; // ดึงครบแล้วรอบก่อน → หยุดเมื่อถึงของเก่า
      await sleep(400);
    }
    saveDownloaded();
    store.write('history', { at: Date.now(), complete: true });
    log('history done, +', added);
    refreshDownloadedMarks();
  };

  // =====================================================================
  // จดหมาย แจ้งเพื่อทราบ/เกมส์ — เว็บบังคับอ่านก่อนโหลด → เปิดอ่านให้
  // =====================================================================
  const readLetters = () => {
    const text = document.body.textContent;
    if (!/\*\*\* แจ้งเพื่อทราบ หรือ จากเกมส์ \d+ ฉบับ \*\*\*/.test(text)) return;
    log('unread notice found → read inbox type 4');
    fetch('/inbox.php?type=4', { credentials: 'same-origin' }).catch((e) => log('letter fail', e));
  };

  // =====================================================================
  // หน้ารายละเอียด
  // =====================================================================
  const runDetailPage = () => {
    const id = idFromHref(location.search);
    if (!id) return;
    if (cfg.markDownloaded) {
      document.querySelectorAll('a[href*="download"]').forEach((a) =>
        a.addEventListener('click', () => markAsDownloaded(id)));
    }
    if (cfg.cleanBookmarks) {
      document.querySelectorAll('a[href*="bookmarks.php"]').forEach((a) => { a.style.display = 'none'; });
    }
    if (cfg.cleanPromote) {
      document.querySelectorAll('a').forEach((a) => {
        if (/^Promote this/i.test(a.textContent.trim())) a.style.display = 'none';
      });
    }
    if (cfg.album) {
      const imgs = [...document.querySelectorAll('.bb-descr img')]
        .filter((i) => /^https?:/i.test(i.getAttribute('src') || ''));
      const srcs = imgs.map((i) => i.src);
      imgs.forEach((img, i) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => { e.preventDefault(); openAlbum(srcs, i); });
      });
    }
    if (cfg.autoThankDetail) {
      // คลิกปุ่มของเว็บเอง แทนการประกอบ URL ajax เอง → เว็บเปลี่ยน endpoint ก็ยังทำงาน
      const btn = document.querySelector('#saythanks a');
      if (btn) { log('auto thank', id); btn.click(); }
    }
  };

  // หน้า downfinish ที่เปิดอยู่: เก็บ id ที่เห็นไว้ด้วย
  const runDownFinishPage = () => {
    document.querySelectorAll('a[href*="details.php"][href*="id="]').forEach((a) => {
      const id = idFromHref(a.getAttribute('href'));
      if (id) downloaded.add(id);
    });
    saveDownloaded();
  };

  // =====================================================================
  // styles
  // =====================================================================
  GM_addStyle(`
    .bbc-cell { width: 90px; text-align: center; vertical-align: middle; }
    .bbc-thumb { max-width: 84px; max-height: 118px; display: block; margin: auto; border-radius: 4px; }
    .bbc-hover {
      position: fixed; z-index: 99998; display: none; pointer-events: none;
      max-width: 45vw; max-height: 88vh; box-shadow: 0 4px 24px rgba(0,0,0,.6); background: #111; border-radius: 4px;
    }
    tr.bbc-done a b, tr.bbc-done a { color: #999 !important; }
    .bbc-expand-btn { font-size: 11px; color: #888 !important; text-decoration: none; white-space: nowrap; }
    .bbc-expand-cell { padding: 8px !important; background: rgba(0,0,0,.04); }
    .bbc-expand-bar { margin-bottom: 6px; font-weight: bold; }
    .bbc-expand-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .bbc-expand-grid img { max-height: 260px; max-width: 100%; cursor: zoom-in; border-radius: 4px; }
    .bbc-album {
      position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,.88);
      display: flex; align-items: center; justify-content: center;
    }
    .bbc-album-img { max-width: 92vw; max-height: 90vh; cursor: pointer; box-shadow: 0 4px 32px #000; }
    .bbc-album-count { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); color: #ddd; font: 14px sans-serif; }
    .bbc-album-nav {
      position: absolute; top: 50%; transform: translateY(-50%); font-size: 48px; line-height: 1;
      background: none; border: 0; color: #fff; cursor: pointer; padding: 16px; opacity: .7;
    }
    .bbc-album-nav:hover { opacity: 1; }
    .bbc-prev { left: 8px; } .bbc-next { right: 8px; }
  `);

  // =====================================================================
  // router
  // =====================================================================
  const path = location.pathname;
  const safe = (name, fn) => { try { return fn(); } catch (e) { console.error('[bb-cover]', name, e); } };

  if (cfg.autoReadLetter) safe('letter', readLetters);
  if (path === '/details.php') safe('detail', runDetailPage);
  else if (path === '/downfinish.php') safe('downfinish', runDownFinishPage);
  else safe('list', runListPage);
  if (cfg.markDownloaded && cfg.downloadHistory) syncHistory().catch((e) => console.error('[bb-cover] history', e));
})();
