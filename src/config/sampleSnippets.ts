import { SampleSnippet } from '../types/accessibility';

/**
 * Pre-configured sample snippets for testing accessibility auditing and remediation.
 * Presets cover critical errors, semantic structure flaws, passing compliant markup,
 * and JSX-specific syntax.
 * 
 * NOTE: Emojis are strictly avoided per project design principles.
 */
export const SAMPLE_SNIPPETS: SampleSnippet[] = [
  {
    id: 'critical',
    name: 'Critical Issues (HTML)',
    description: 'รูปภาพไม่มี alt, ช่องกรอกข้อมูลไม่มีป้ายชื่อ label, และปุ่มว่างเปล่า',
    syntaxMode: 'html',
    code: `<div class="card">
  <img src="/banner.jpg">
  <h3>ลงทะเบียนสมาชิกใหม่</h3>
  <input type="text" placeholder="ชื่อ-นามสกุล">
  <div onclick="submitForm()">ส่งข้อมูล</div>
</div>`,
  },
  {
    id: 'semantic',
    name: 'Semantic Structure (HTML)',
    description: 'ข้ามระดับหัวข้อ (h3 โดยไม่มี h1) และตารางข้อมูลไม่มี th',
    syntaxMode: 'html',
    code: `<div class="container">
  <div class="content">
    <h3>สรุปยอดสั่งซื้อประจำเดือน</h3>
    <p>รายละเอียดรายการสั่งซื้อทั้งหมด</p>
    <table>
      <tr>
        <td>รหัสสินค้า</td>
        <td>ชื่อสินค้า</td>
        <td>ราคา</td>
      </tr>
      <tr>
        <td>SKU-001</td>
        <td>คอร์สเรียนเว็บเบื้องต้น</td>
        <td>1,500 บาท</td>
      </tr>
    </table>
  </div>
</div>`,
  },
  {
    id: 'pass',
    name: 'Passing Compliant (HTML)',
    description: 'โครงสร้างถูกต้องตามมาตรฐาน WCAG มี landmark, heading ลำดับถูกต้อง, alt และ label ครบถ้วน',
    syntaxMode: 'html',
    code: `<main>
  <h1>ระบบตรวจสอบการเข้าถึงเว็บไซต์</h1>
  <img src="/logo.png" alt="โลโก้ผู้ให้บริการ" />
  <form>
    <label for="user-email">อีเมลผู้ใช้งาน</label>
    <input id="user-email" type="email" />
    <button type="submit">เข้าสู่ระบบ</button>
  </form>
</main>`,
  },
  {
    id: 'jsx-form',
    name: 'JSX Form & Controls',
    description: 'คอมโพเนนต์ JSX ที่มี onClick บน div, tabIndex เป็นบวก, และไม่มี label',
    syntaxMode: 'jsx',
    code: `<div className="card">
  <img src="/promo.jpg" />
  <h3>ลงทะเบียนรับสิทธิ์</h3>
  <input type="email" placeholder="กรอกอีเมล" />
  <div onClick={handleSend} tabIndex={2}>ยืนยันข้อมูล</div>
</div>`,
  },
];
