// ==UserScript==
// @name         Bearbit Cover (lite) — local loader
// @namespace    kitti.local
// @version      0.6.1
// @description  ตัวโหลด: ดึง bearbit-cover.user.js จากไฟล์ในเครื่อง แก้ไฟล์นั้นแล้ว refresh หน้าเว็บได้เลย
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
// @require      file:///C:/Users/kitti/Desktop/barebit-image/bearbit-cover.user.js
// ==/UserScript==

// ไฟล์นี้ว่างโดยตั้งใจ — โค้ดจริงอยู่ใน bearbit-cover.user.js (ที่ @require ด้านบน)
// @match / @grant / @connect ต้องประกาศที่ไฟล์นี้ เพราะ Tampermonkey อ่าน header จาก loader ไม่ใช่จากไฟล์ที่ require
// แก้ header ในไฟล์หลักเมื่อไหร่ ต้อง paste loader นี้ใหม่ใน Tampermonkey ด้วย
