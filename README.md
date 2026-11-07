# Bearbit Cover (lite)

Userscript สำหรับ bearbit.org — หน้าปก, รูปใหญ่เมื่อชี้เมาส์, อัลบั้ม, ปุ่มขยายใต้รายการ,
ชื่อสีเทาเมื่อโหลดแล้ว (รวมย้อนหลัง), ขอบคุณ/อ่านจดหมายอัตโนมัติ

เขียนใหม่จาก concept ของ [cover-next](https://github.com/kon3ko/cover-next) — ไม่ส่งข้อมูลออกนอก bearbit
(ยกเว้นเปิดหน้าฝากรูปเพื่อหา URL รูปจริง) และไม่มีโค้ดกันดีบัก

## ติดตั้ง

ต้องมี [Tampermonkey](https://www.tampermonkey.net/) แล้วเปิดลิงก์นี้:

https://raw.githubusercontent.com/kitti332/bearbit-cover/main/bearbit-cover.user.js

Tampermonkey จะอัปเดตเองเมื่อ `@version` ในไฟล์เปลี่ยน
(หรือสั่งเองได้ที่ Tampermonkey → Utilities → Check for userscript updates)

ตั้งค่าเปิด/ปิดแต่ละฟีเจอร์ได้จากเมนู Tampermonkey บนหน้า bearbit

## พัฒนาในเครื่อง

`loader.user.js` ใช้ `@require file:///…` ดึงไฟล์ในเครื่อง → แก้แล้ว refresh ได้เลยไม่ต้อง push
(ต้องเปิด "Allow access to file URLs" ของ Tampermonkey ใน `chrome://extensions`)
อย่าเปิดตัว loader กับตัวที่ติดตั้งจาก GitHub พร้อมกัน

ออก version ใหม่: แก้ `@version` ใน `bearbit-cover.user.js` → commit → push
