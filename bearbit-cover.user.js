// ==UserScript==
// @name         Bearbit Cover (lite)
// @namespace    kitti.local
// @version      0.4.0
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
// @connect      imgbb.ws
// @connect      ibb.co
// @connect      imgbb.com
// @connect      imgbb.me
// @connect      img.in.th
// @connect      in.th
// @connect      imgur.com
// @connect      postto.me
// @connect      picz.in.th
// @connect      234.in.th
// @connect      uppic.cc
// @connect      uppicimg.com
// @connect      uppic.xyz
// @connect      gifyu.com
// @connect      imgvb.com
// @connect      up-pic.com
// @connect      pic.4th.in
// @connect      shotcan.com
// @connect      img.live
// @connect      mpic.ws
// @connect      roop.xyz
// @connect      bpicc.com
// @connect      bpicc.cc
// @connect      imgtrue.com
// @connect      i-pic.info
// @connect      picstate.com
// @connect      lookimg.com
// @connect      imgmak.com
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
    ['autoThankList',   true,  'ขอบคุณอัตโนมัติก่อนโหลด (หน้ารายการ)'],
    ['fixImageOverScreen', true, 'ย่อรูปไม่ให้ล้นจอ (หน้ารายละเอียด)'],
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
  cfg.downloadWarnGB = Number(cfg.downloadWarnGB) || 10;
  GM_registerMenuCommand(`⚠ เตือนไฟล์ใหญ่เกิน ${cfg.downloadWarnGB} GB (แก้)`, () => {
    const v = Number(prompt('ปุ่ม Download เป็นสีแดงเมื่อไฟล์ใหญ่กว่า (GB):', cfg.downloadWarnGB));
    if (v > 0) { cfg.downloadWarnGB = v; GM_setValue('settings', cfg); location.reload(); }
  });
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

  // v0.3.x เก็บ id ผู้ใช้ (userdetails.php?id=) ปนเข้ามาใน downloaded → ล้างครั้งเดียวแล้วดึงประวัติใหม่
  if (!store.read('migratedUserIds', false)) {
    store.write('downloaded', []);
    store.write('history', { at: 0, complete: false });
    store.write('migratedUserIds', true);
  }

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
  // id ของ torrent จากลิงก์ details.php เท่านั้น — "userdetails.php" ก็ลงท้ายด้วย details.php ต้องกันไว้
  const TORRENT_HREF = /(^|\/)details\.php\?(.*&)?id=\d+/;
  const torrentIdFromHref = (href) => (TORRENT_HREF.test(href || '') ? idFromHref(href) : null);
  const torrentLinks = (root) => [...root.querySelectorAll('a[href*="details.php"]')]
    .filter((a) => TORRENT_HREF.test(a.getAttribute('href') || ''));

  // หน้ารายละเอียดของเรื่องที่เคยโหลด เขียนว่า "คุณเคยดาวน์โหลดไฟล์ .torrent นี้แล้ว"
  const DOWNLOADED_MARK = /คุณเคยดาวน์โหลดไฟล์ \.torrent นี้แล้ว|เคยโหลดแล้ว \/ โหลดซ้ำ|\(Downloaded ไปแล้ว\)/;
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

  // เอกสารหน้ารายละเอียดเก็บไว้ในหน่วยความจำระหว่างเปิดหน้านี้ (ใช้ร่วมกัน: ปก / คำอธิบาย / ขอบคุณ)
  const docCache = new Map();
  const onDetailDoc = []; // callback(id, doc) เช่น จับว่าเคยโหลดแล้ว
  const detailDoc = (id, url) => {
    if (!docCache.has(id)) {
      const p = queued(() => fetchDoc(url)).then((doc) => {
        onDetailDoc.forEach((fn) => fn(id, doc));
        return doc;
      });
      p.catch(() => docCache.delete(id)); // พลาดแล้วให้ลองใหม่ได้
      docCache.set(id, p);
    }
    return docCache.get(id);
  };

  const getDetail = (id, url) => {
    const hit = detailCache[id];
    if (hit && Date.now() - hit.at < DETAIL_TTL) return Promise.resolve(hit);
    if (inflight.has(id)) return inflight.get(id);
    const p = (async () => {
      const info = { ...(await parseDetail(await detailDoc(id, url))), at: Date.now() };
      detailCache[id] = info;
      store.write('details', detailCache);
      log('detail', id, info.images.length, 'images');
      return info;
    })().finally(() => inflight.delete(id));
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
  // items: URL รูป (string) หรือ { load: async () => url, caption: () => Node }
  // ซ้อนกันได้ (อัลบั้มทั้งหน้า → รูปทั้งหมดของเรื่องเดียว) ปุ่มคีย์บอร์ดไปที่อันบนสุด
  const albumStack = [];
  document.addEventListener('keydown', (e) => {
    const top = albumStack[albumStack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') top.close();
    else if (e.key === 'ArrowLeft') top.go(-1);
    else if (e.key === 'ArrowRight') top.go(1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  const openAlbum = (rawItems, start = 0, { wrap = true } = {}) => {
    const items = rawItems.map((it) => (typeof it === 'string' ? { load: async () => it } : it));
    if (!items.length) return;
    let i = Math.min(Math.max(0, start), items.length - 1);
    let token = 0;
    const img = el('img', { className: 'bbc-album-img', referrerPolicy: 'no-referrer' });
    const status = el('div', { className: 'bbc-album-status' });
    const counter = el('div', { className: 'bbc-album-count' });
    const caption = el('div', { className: 'bbc-album-caption', onclick: (e) => e.stopPropagation() });
    const prev = el('button', { className: 'bbc-album-nav bbc-prev', textContent: '‹', onclick: (e) => { e.stopPropagation(); go(-1); } });
    const next = el('button', { className: 'bbc-album-nav bbc-next', textContent: '›', onclick: (e) => { e.stopPropagation(); go(1); } });
    const box = el('div', { className: 'bbc-album' }, img, status, counter, caption, prev, next);

    const preload = (j) => {
      if (j < 0 || j >= items.length) return;
      items[j].load().then((u) => { if (u) new Image().src = u; }).catch(() => {});
    };
    const show = async () => {
      const my = ++token;
      const it = items[i];
      counter.textContent = `${i + 1} / ${items.length}`;
      caption.replaceChildren(...(it.caption ? [it.caption()] : []));
      prev.disabled = !wrap && i === 0;
      next.disabled = !wrap && i === items.length - 1;
      img.style.visibility = 'hidden';
      status.textContent = 'กำลังโหลด…';
      let url = null;
      try { url = await it.load(); } catch (e) { log('album load fail', e); }
      if (my !== token) return; // เลื่อนไปรูปอื่นแล้ว
      if (!url) { status.textContent = 'ไม่มีรูป'; img.removeAttribute('src'); return; }
      img.onload = () => { if (my === token) { status.textContent = ''; img.style.visibility = ''; } };
      img.onerror = () => { if (my === token) status.textContent = 'โหลดรูปไม่ได้'; };
      img.src = url;
      preload(i + 1);
      preload(i - 1);
    };
    const go = (d) => {
      const n = i + d;
      if (wrap) i = (n + items.length) % items.length;
      else if (n >= 0 && n < items.length) i = n;
      else return;
      show();
    };
    const close = () => {
      box.remove();
      const k = albumStack.indexOf(api);
      if (k >= 0) albumStack.splice(k, 1);
    };
    const api = { go, close };

    img.onclick = (e) => { e.stopPropagation(); go(1); };
    box.onclick = close;
    albumStack.push(api);
    document.body.append(box);
    if (items.length < 2) { prev.remove(); next.remove(); counter.remove(); }
    show();
  };

  // =====================================================================
  // หน้ารายการ
  // =====================================================================
  // หาเลขคอลัมน์ ขนาด/เสร็จ/ปล่อย/ดูด จากหัวตาราง (สำหรับ caption ในอัลบั้ม)
  const COLS = {
    size: ['ขนาด', 'ขนาดไฟล์', 'Size'],
    done: ['เสร็จ', 'โหลดเสร็จ', 'คนโหลดเสร็จ'],
    seed: ['ปล่อย', 'คนปล่อย', 'Seeder'],
    peer: ['ดูด', 'คนดูด', 'Leecher'],
  };
  const columnIndex = (headRow) => {
    const heads = [...headRow.cells].map((c) => c.textContent.trim());
    return Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, heads.findIndex((h) => names.includes(h))]));
  };

  const parseRow = (tr, cols = {}) => {
    if (!tr.cells || tr.cells.length < 2) return null;
    // หาลิงก์ details จากทั้งแถว ไม่ผูกเลขคอลัมน์ (layout ใหม่มีคอลัมน์ "รูป" แทรกที่ index 1)
    const titleLink = torrentLinks(tr)[0];
    const id = torrentIdFromHref(titleLink?.getAttribute('href'));
    if (!id) return null; // แถวโฆษณา/คั่น → ข้าม
    const camLink = tr.querySelector('a > img[src*="cam"]')?.parentElement;
    const nativeImg = tr.querySelector('td.poster-column img');
    const nativeSrc = nativeImg?.getAttribute('src') || '';
    // ดึงค่าตอน parse (ก่อนเราแทรกคอลัมน์ปก ซึ่งจะทำให้เลขคอลัมน์เลื่อน)
    const stat = (k) => (cols[k] >= 0 ? tr.cells[cols[k]]?.textContent.trim() : '') || '-';
    return {
      tr,
      id,
      titleLink,
      title: titleLink.textContent.trim(),
      stats: { size: stat('size'), done: stat('done'), seed: stat('seed'), peer: stat('peer') },
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

  // ---------- ขอบคุณก่อนโหลด (แบบ autoThankHook ของ cover-next) ----------
  // ปุ่มของเว็บ: <td id="saythanks"><a onclick="sndReq('action=say_thanks&id=N')"> → GET /ajax.php?<arg>
  const thanked = new Set(store.read('thanked', []));
  const thankRow = async (row) => {
    if (thanked.has(row.id)) return;
    const doc = await detailDoc(row.id, row.detailUrl);
    const onclick = doc.querySelector('#saythanks a')?.getAttribute('onclick') || '';
    const arg = /sndReq\(\s*'([^']*say_thanks[^']*)'/.exec(onclick)?.[1];
    if (!arg) { log('thank: no button', row.id); return; }
    const res = await fetch(`/ajax.php?${arg}`, { credentials: 'same-origin' });
    log('thank', row.id, res.status);
    if (res.ok) {
      thanked.add(row.id);
      store.write('thanked', [...thanked].slice(-5000));
    }
  };

  const withTimeout = (p, ms) => Promise.race([p, sleep(ms)]);

  // กดโหลดจากหน้ารายการ: ขอบคุณก่อน (รอไม่เกิน 5 วิ) แล้วค่อยไปลิงก์ดาวน์โหลด
  const handleDownload = async (row, link, e) => {
    markRow(row);
    if (!cfg.autoThankList || thanked.has(row.id)) return; // ปล่อยให้ลิงก์ทำงานตามปกติ
    e.preventDefault();
    try { await withTimeout(thankRow(row), 5000); } catch (err) { log('thank fail', err); }
    location.href = link;
  };

  // ---------- ปุ่ม Download บอกขนาด ----------
  const sizeInGB = (text) => {
    const m = /([\d.,]+)\s*(TB|GB|MB|KB)/i.exec(text || '');
    if (!m) return 0;
    const n = parseFloat(m[1].replace(/,/g, ''));
    return n * ({ TB: 1024, GB: 1, MB: 1 / 1024, KB: 1 / 1048576 })[m[2].toUpperCase()];
  };
  const downloadButton = (row) => {
    const link = row.downloadLinks[0]?.href;
    if (!link) return null;
    const big = sizeInGB(row.stats.size) > cfg.downloadWarnGB;
    const a = el('a', {
      href: link,
      className: `bbc-btn bbc-btn-dl${big ? ' bbc-btn-big' : ''}`,
      textContent: `⬇ Download ${row.stats.size !== '-' ? row.stats.size : ''}${downloaded.has(row.id) ? ' (โหลดไปแล้ว)' : ''}`,
      title: big ? `ไฟล์ใหญ่กว่า ${cfg.downloadWarnGB} GB` : '',
    });
    a.addEventListener('click', (e) => handleDownload(row, link, e));
    return a;
  };

  // ---------- ปุ่ม View: คำอธิบายเต็มเป็น popup ----------
  // คำอธิบายเป็นข้อความที่ผู้ลงพิมพ์ → ตัด script/iframe/on* ออกก่อนใส่หน้า
  const sanitize = (root) => {
    root.querySelectorAll('script, iframe, object, embed, link, meta, form').forEach((n) => n.remove());
    root.querySelectorAll('*').forEach((n) => {
      for (const at of [...n.attributes]) {
        if (/^on/i.test(at.name) || /^\s*javascript:/i.test(at.value)) n.removeAttribute(at.name);
      }
      if (n.tagName === 'A') { n.target = '_blank'; n.rel = 'noopener noreferrer'; }
      if (n.tagName === 'IMG') n.referrerPolicy = 'no-referrer';
    });
    return root;
  };

  const openModal = (content) => {
    const panel = el('div', { className: 'bbc-modal-panel', onclick: (e) => e.stopPropagation() },
      el('button', { className: 'bbc-modal-close', textContent: '✕', onclick: () => close() }),
      content);
    const box = el('div', { className: 'bbc-modal' }, panel);
    const api = { go() {}, close: () => close() };
    const close = () => {
      box.remove();
      const k = albumStack.indexOf(api);
      if (k >= 0) albumStack.splice(k, 1);
    };
    box.onclick = close;
    albumStack.push(api); // ใช้ Esc ร่วมกับอัลบั้ม
    document.body.append(box);
    return panel;
  };

  const openDescription = async (row) => {
    const body = el('div', { className: 'bbc-desc', textContent: 'กำลังโหลด…' });
    const head = el('div', { className: 'bbc-desc-head' },
      el('a', { href: row.detailUrl, target: '_blank', className: 'bbc-desc-title', textContent: row.title }));
    const dl = downloadButton(row);
    if (dl) head.append(dl);
    openModal(el('div', {}, head, body));
    try {
      const doc = await detailDoc(row.id, row.detailUrl);
      const src = doc.querySelector('.bb-descr')
        || [...doc.querySelectorAll('td.rowhead')].find((t) => /^description$/i.test(t.textContent.trim()))?.nextElementSibling;
      body.replaceChildren();
      if (!src) { body.textContent = 'ไม่พบคำอธิบาย'; return; }
      const copy = sanitize(document.importNode(src, true));
      copy.querySelectorAll('img').forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => { e.preventDefault(); openAlbum([img.src]); });
      });
      body.append(copy);
    } catch (e) {
      body.textContent = `โหลดไม่ได้: ${e}`;
    }
  };

  const viewButton = (row) => el('a', {
    href: '#',
    className: 'bbc-btn',
    textContent: '📄 View',
    onclick: (e) => { e.preventDefault(); openDescription(row); },
  });

  const makeThumb = (url) => {
    const img = el('img', { className: 'bbc-thumb', loading: 'lazy', referrerPolicy: 'no-referrer', src: url });
    return img;
  };

  // caption ใต้รูปในอัลบั้มทั้งหน้า: ชื่อ, ดาวน์โหลด, สถิติ, ปุ่มดูรูปทั้งหมดของเรื่องนี้
  const rowCaption = (row) => {
    const box = el('div', {},
      el('a', { href: row.detailUrl, target: '_blank', className: 'bbc-cap-title', textContent: row.title }));
    const line = el('div', { className: 'bbc-cap-line' });
    const dl = downloadButton(row);
    if (dl) line.append(dl);
    line.append(viewButton(row));
    line.append(el('a', {
      href: '#',
      className: 'bbc-btn',
      textContent: '🖼 รูปทั้งหมด',
      onclick: async (e) => {
        e.preventDefault();
        openAlbum(await albumOf(row));
      },
    }));
    const { size, done, seed, peer } = row.stats;
    line.append(el('span', { textContent: `ขนาด: ${size} | เสร็จ: ${done} | ปล่อย: ${seed} | ดูด: ${peer}` }));
    box.append(line);
    return box;
  };

  // อัลบั้มทั้งหน้า: ปกของทุก torrent เรียงต่อกัน ← → เปลี่ยนเรื่อง (แบบ cover-next เดิม)
  const openPageAlbum = (row) => {
    const items = allRows.map((r) => ({ load: () => bigCoverOf(r), caption: () => rowCaption(r) }));
    openAlbum(items, allRows.indexOf(row), { wrap: false });
  };

  const wireCover = (img, row) => {
    if (cfg.previewHover) attachHover(img, () => bigCoverOf(row));
    if (cfg.album) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideHover();
        openPageAlbum(row);
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
    const bar = el('div', { className: 'bbc-expand-bar' });
    const dl = downloadButton(row);
    if (dl) bar.append(dl);
    bar.append(viewButton(row),
      el('a', { href: row.detailUrl, target: '_blank', className: 'bbc-btn', textContent: '↗ หน้ารายละเอียด' }));
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
    if (cfg.markDownloaded) row.tr.classList.add('bbc-done');
  };

  const enhanceRow = (row, { observer, byCell, addColumn }) => {
    if (cfg.markDownloaded && downloaded.has(row.id)) row.tr.classList.add('bbc-done');
    // ลิงก์ดาวน์โหลดของเว็บในแถว: จำว่าโหลดแล้ว + ขอบคุณก่อน
    row.downloadLinks.forEach((a) => a.addEventListener('click', (e) => handleDownload(row, a.href, e)));

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
      const cols = columnIndex(table.rows[0]);
      const rows = [];
      for (const tr of [...table.rows].slice(1)) {
        const row = parseRow(tr, cols);
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

  // หน้ารายละเอียดที่โหลดมาเบื้องหลัง (ปก/View/ขอบคุณ) บอกว่าเคยโหลดแล้ว → ทำเครื่องหมายด้วย
  onDetailDoc.push((id, doc) => {
    if (downloaded.has(id) || !DOWNLOADED_MARK.test(doc.body?.textContent || '')) return;
    log('detail says downloaded', id);
    markAsDownloaded(id);
    refreshDownloadedMarks();
  });

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
      const ids = torrentLinks(doc).map((a) => torrentIdFromHref(a.getAttribute('href'))).filter(Boolean);
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
    document.querySelectorAll('a[href*="download"]').forEach((a) =>
      a.addEventListener('click', () => markAsDownloaded(id)));
    // เว็บบอกเองว่าเคยโหลดแล้ว
    if (DOWNLOADED_MARK.test(document.body.textContent)) markAsDownloaded(id);
    if (cfg.fixImageOverScreen) document.documentElement.classList.add('bbc-fit-images');
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
      if (btn && !thanked.has(id)) {
        log('auto thank', id);
        btn.click();
        thanked.add(id);
        store.write('thanked', [...thanked].slice(-5000));
      }
    }
  };

  // หน้า downfinish ที่เปิดอยู่: เก็บ id ที่เห็นไว้ด้วย
  const runDownFinishPage = () => {
    torrentLinks(document).forEach((a) => {
      const id = torrentIdFromHref(a.getAttribute('href'));
      if (id) downloaded.add(id);
    });
    saveDownloaded();
  };

  // =====================================================================
  // styles
  // =====================================================================
  GM_addStyle(`
    .bbc-cell { width: 90px; text-align: center; vertical-align: middle; }
    html.bbc-fit-images .bb-descr img, html.bbc-fit-images td img, .bbc-desc img {
      max-width: 100% !important; height: auto !important;
    }
    .bbc-btn {
      display: inline-block; color: #fff !important; text-decoration: none !important; background: #455a64;
      padding: 3px 10px; border-radius: 4px; font-size: 12px; line-height: 1.6; white-space: nowrap;
    }
    .bbc-btn:hover { filter: brightness(1.15); }
    .bbc-btn-dl { background: #2e7d32; }
    .bbc-btn-big { background: #c62828; }
    .bbc-expand-bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .bbc-modal {
      position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,.75);
      display: flex; align-items: flex-start; justify-content: center; overflow: auto; padding: 4vh 16px;
    }
    .bbc-modal-panel {
      position: relative; background: #fff; color: #222; max-width: 900px; width: 100%;
      border-radius: 8px; padding: 16px 20px; box-shadow: 0 8px 40px rgba(0,0,0,.5);
    }
    .bbc-modal-close {
      position: absolute; top: 8px; right: 10px; border: 0; background: none; font-size: 20px; cursor: pointer; color: #666;
    }
    .bbc-desc-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 0 28px 12px 0; }
    .bbc-desc-title { font-weight: bold; font-size: 15px; }
    .bbc-desc { overflow-wrap: anywhere; }
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
    .bbc-album-nav:disabled { opacity: .15; cursor: default; }
    .bbc-album-img { max-height: calc(100vh - 140px); }
    .bbc-album-status { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: #ccc; font: 16px sans-serif; }
    .bbc-album-caption {
      position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
      max-width: 90vw; text-align: center; color: #eee; font: 14px/1.5 sans-serif;
      background: rgba(0,0,0,.6); padding: 8px 14px; border-radius: 6px;
    }
    .bbc-album-caption:empty { display: none; }
    .bbc-cap-title { color: #fff !important; font-weight: bold; font-size: 15px; }
    .bbc-cap-line { margin-top: 6px; display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; }
    .bbc-cap-btn {
      color: #fff !important; text-decoration: none; background: #2e7d32; padding: 3px 10px; border-radius: 4px;
    }
    .bbc-cap-btn + .bbc-cap-btn { background: #455a64; }
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
