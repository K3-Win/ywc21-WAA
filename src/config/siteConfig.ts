import { SiteConfig } from '../types/accessibility';

/**
 * Centralized Configuration for Web Accessibility Inspector.
 * 
 * Customize branding, logo text, scoring penalties, and grade thresholds here.
 * NOTE: Emojis are strictly avoided per project design principles.
 */
export const SITE_CONFIG: SiteConfig = {
  branding: {
    name: 'Web Accessibility Inspector',
    tagline: 'WCAG 2.1 / 2.2 Client-Side Audit & Remediation',
    logoText: 'A11y Inspector',
  },
  scoring: {
    maxScore: 100,
    minScore: 0,
    penalties: {
      critical: 20,
      moderate: 10,
      minor: 5,
    },
    grades: [
      {
        grade: 'A',
        minScore: 90,
        stars: 5,
        label: 'ยอดเยี่ยม (Excellent)',
      },
      {
        grade: 'B',
        minScore: 80,
        stars: 4,
        label: 'ดี (Good)',
      },
      {
        grade: 'C',
        minScore: 70,
        stars: 3,
        label: 'พอใช้ (Fair)',
      },
      {
        grade: 'D',
        minScore: 60,
        stars: 2,
        label: 'ต้องปรับปรุง (Poor)',
      },
      {
        grade: 'F',
        minScore: 0,
        stars: 1,
        label: 'ไม่ผ่านเกณฑ์ (Failing)',
      },
    ],
  },
  categories: {
    'text-alt': {
      title: 'Text Alternatives',
      subtitle: 'ภาพและสื่อมัลติมีเดียต้องมีคำบรรยาย',
    },
    forms: {
      title: 'Form Controls & Labels',
      subtitle: 'ฟอร์มและปุ่มต้องมีป้ายชื่อชัดเจน',
    },
    semantic: {
      title: 'Semantic Structure',
      subtitle: 'โครงสร้าง HTML และระดับหัวข้อ',
    },
    attributes: {
      title: 'Attributes & Navigation',
      subtitle: 'การนำทาง ลิงก์ และการโฟกัส',
    },
  },
};
