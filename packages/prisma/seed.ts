import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return `seed:${hash}`;
}

// ─── MDM Seed Helpers ────────────────────────────────────────────────────────

async function seedRefData(
  type: string,
  items: Array<{ code: string; label: string; metadata?: object; sortOrder?: number }>,
) {
  for (const [i, item] of items.entries()) {
    const existing = await prisma.referenceData.findFirst({
      where: { type, code: item.code, orgId: null },
    });
    if (existing) {
      await prisma.referenceData.update({
        where: { id: existing.id },
        data: { label: item.label, sortOrder: item.sortOrder ?? i },
      });
    } else {
      await prisma.referenceData.create({
        data: {
          type,
          code: item.code,
          label: item.label,
          metadata: item.metadata ?? undefined,
          sortOrder: item.sortOrder ?? i,
          orgId: null,
        },
      });
    }
  }
}

// ─── MDM Data ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar',             metadata: { symbol: '$',  decimals: 2 } },
  { code: 'EUR', label: 'Euro',                   metadata: { symbol: '€',  decimals: 2 } },
  { code: 'GBP', label: 'British Pound',          metadata: { symbol: '£',  decimals: 2 } },
  { code: 'AED', label: 'UAE Dirham',             metadata: { symbol: 'د.إ', decimals: 2 } },
  { code: 'SAR', label: 'Saudi Riyal',            metadata: { symbol: '﷼',  decimals: 2 } },
  { code: 'QAR', label: 'Qatari Riyal',           metadata: { symbol: 'ر.ق', decimals: 2 } },
  { code: 'KWD', label: 'Kuwaiti Dinar',          metadata: { symbol: 'د.ك', decimals: 3 } },
  { code: 'BHD', label: 'Bahraini Dinar',         metadata: { symbol: 'BD',  decimals: 3 } },
  { code: 'OMR', label: 'Omani Rial',             metadata: { symbol: 'ر.ع', decimals: 3 } },
  { code: 'JOD', label: 'Jordanian Dinar',        metadata: { symbol: 'JD',  decimals: 3 } },
  { code: 'EGP', label: 'Egyptian Pound',         metadata: { symbol: 'E£',  decimals: 2 } },
  { code: 'JPY', label: 'Japanese Yen',           metadata: { symbol: '¥',  decimals: 0 } },
  { code: 'CNY', label: 'Chinese Yuan',           metadata: { symbol: '¥',  decimals: 2 } },
  { code: 'INR', label: 'Indian Rupee',           metadata: { symbol: '₹',  decimals: 2 } },
  { code: 'AUD', label: 'Australian Dollar',      metadata: { symbol: 'A$', decimals: 2 } },
  { code: 'CAD', label: 'Canadian Dollar',        metadata: { symbol: 'C$', decimals: 2 } },
  { code: 'CHF', label: 'Swiss Franc',            metadata: { symbol: 'Fr', decimals: 2 } },
  { code: 'SGD', label: 'Singapore Dollar',       metadata: { symbol: 'S$', decimals: 2 } },
  { code: 'HKD', label: 'Hong Kong Dollar',       metadata: { symbol: 'HK$', decimals: 2 } },
  { code: 'NZD', label: 'New Zealand Dollar',     metadata: { symbol: 'NZ$', decimals: 2 } },
  { code: 'SEK', label: 'Swedish Krona',          metadata: { symbol: 'kr', decimals: 2 } },
  { code: 'NOK', label: 'Norwegian Krone',        metadata: { symbol: 'kr', decimals: 2 } },
  { code: 'DKK', label: 'Danish Krone',           metadata: { symbol: 'kr', decimals: 2 } },
  { code: 'ZAR', label: 'South African Rand',     metadata: { symbol: 'R',  decimals: 2 } },
  { code: 'BRL', label: 'Brazilian Real',         metadata: { symbol: 'R$', decimals: 2 } },
  { code: 'MXN', label: 'Mexican Peso',           metadata: { symbol: '$',  decimals: 2 } },
  { code: 'TRY', label: 'Turkish Lira',           metadata: { symbol: '₺',  decimals: 2 } },
  { code: 'IDR', label: 'Indonesian Rupiah',      metadata: { symbol: 'Rp', decimals: 0 } },
  { code: 'PKR', label: 'Pakistani Rupee',        metadata: { symbol: '₨',  decimals: 2 } },
  { code: 'NGN', label: 'Nigerian Naira',         metadata: { symbol: '₦',  decimals: 2 } },
  { code: 'KES', label: 'Kenyan Shilling',        metadata: { symbol: 'KSh', decimals: 2 } },
  { code: 'GHS', label: 'Ghanaian Cedi',          metadata: { symbol: '₵',  decimals: 2 } },
  { code: 'MAD', label: 'Moroccan Dirham',        metadata: { symbol: 'DH',  decimals: 2 } },
  { code: 'TND', label: 'Tunisian Dinar',         metadata: { symbol: 'DT',  decimals: 3 } },
  { code: 'TWD', label: 'Taiwan Dollar',          metadata: { symbol: 'NT$', decimals: 2 } },
  { code: 'THB', label: 'Thai Baht',              metadata: { symbol: '฿',  decimals: 2 } },
  { code: 'PHP', label: 'Philippine Peso',        metadata: { symbol: '₱',  decimals: 2 } },
  { code: 'MYR', label: 'Malaysian Ringgit',      metadata: { symbol: 'RM', decimals: 2 } },
  { code: 'RUB', label: 'Russian Ruble',          metadata: { symbol: '₽',  decimals: 2 } },
  { code: 'PLN', label: 'Polish Zloty',           metadata: { symbol: 'zł', decimals: 2 } },
];

const COUNTRIES = [
  { code: 'AE', label: 'United Arab Emirates' }, { code: 'SA', label: 'Saudi Arabia' },
  { code: 'QA', label: 'Qatar' },                { code: 'KW', label: 'Kuwait' },
  { code: 'BH', label: 'Bahrain' },              { code: 'OM', label: 'Oman' },
  { code: 'JO', label: 'Jordan' },               { code: 'EG', label: 'Egypt' },
  { code: 'LB', label: 'Lebanon' },              { code: 'IQ', label: 'Iraq' },
  { code: 'US', label: 'United States' },        { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },              { code: 'FR', label: 'France' },
  { code: 'IT', label: 'Italy' },                { code: 'ES', label: 'Spain' },
  { code: 'NL', label: 'Netherlands' },          { code: 'BE', label: 'Belgium' },
  { code: 'CH', label: 'Switzerland' },          { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },               { code: 'DK', label: 'Denmark' },
  { code: 'FI', label: 'Finland' },              { code: 'PL', label: 'Poland' },
  { code: 'AU', label: 'Australia' },            { code: 'NZ', label: 'New Zealand' },
  { code: 'SG', label: 'Singapore' },            { code: 'HK', label: 'Hong Kong' },
  { code: 'JP', label: 'Japan' },                { code: 'CN', label: 'China' },
  { code: 'IN', label: 'India' },                { code: 'PK', label: 'Pakistan' },
  { code: 'BD', label: 'Bangladesh' },           { code: 'LK', label: 'Sri Lanka' },
  { code: 'MY', label: 'Malaysia' },             { code: 'TH', label: 'Thailand' },
  { code: 'ID', label: 'Indonesia' },            { code: 'PH', label: 'Philippines' },
  { code: 'VN', label: 'Vietnam' },              { code: 'KR', label: 'South Korea' },
  { code: 'TW', label: 'Taiwan' },               { code: 'CA', label: 'Canada' },
  { code: 'MX', label: 'Mexico' },               { code: 'BR', label: 'Brazil' },
  { code: 'AR', label: 'Argentina' },            { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },             { code: 'ZA', label: 'South Africa' },
  { code: 'NG', label: 'Nigeria' },              { code: 'KE', label: 'Kenya' },
  { code: 'GH', label: 'Ghana' },               { code: 'MA', label: 'Morocco' },
  { code: 'TN', label: 'Tunisia' },              { code: 'TR', label: 'Turkey' },
  { code: 'RU', label: 'Russia' },              { code: 'UA', label: 'Ukraine' },
  { code: 'PT', label: 'Portugal' },            { code: 'AT', label: 'Austria' },
  { code: 'IE', label: 'Ireland' },             { code: 'CZ', label: 'Czech Republic' },
  { code: 'RO', label: 'Romania' },             { code: 'HU', label: 'Hungary' },
  { code: 'GR', label: 'Greece' },              { code: 'IL', label: 'Israel' },
];

const TIMEZONES = [
  { code: 'UTC',                    label: 'UTC (Coordinated Universal Time)' },
  { code: 'Asia/Dubai',             label: 'Dubai (GST +4)' },
  { code: 'Asia/Riyadh',           label: 'Riyadh (AST +3)' },
  { code: 'Asia/Kuwait',            label: 'Kuwait (AST +3)' },
  { code: 'Asia/Qatar',             label: 'Qatar (AST +3)' },
  { code: 'Asia/Bahrain',           label: 'Bahrain (AST +3)' },
  { code: 'Asia/Muscat',            label: 'Muscat (GST +4)' },
  { code: 'Asia/Amman',             label: 'Amman (EET +3)' },
  { code: 'Africa/Cairo',           label: 'Cairo (EET +2)' },
  { code: 'Asia/Beirut',            label: 'Beirut (EET +3)' },
  { code: 'Europe/London',          label: 'London (GMT/BST)' },
  { code: 'Europe/Paris',           label: 'Paris (CET +1)' },
  { code: 'Europe/Berlin',          label: 'Berlin (CET +1)' },
  { code: 'Europe/Amsterdam',       label: 'Amsterdam (CET +1)' },
  { code: 'Europe/Moscow',          label: 'Moscow (MSK +3)' },
  { code: 'Asia/Kolkata',           label: 'India (IST +5:30)' },
  { code: 'Asia/Karachi',           label: 'Karachi (PKT +5)' },
  { code: 'Asia/Dhaka',             label: 'Dhaka (BST +6)' },
  { code: 'Asia/Singapore',         label: 'Singapore (SGT +8)' },
  { code: 'Asia/Hong_Kong',         label: 'Hong Kong (HKT +8)' },
  { code: 'Asia/Shanghai',          label: 'China (CST +8)' },
  { code: 'Asia/Tokyo',             label: 'Tokyo (JST +9)' },
  { code: 'Asia/Seoul',             label: 'Seoul (KST +9)' },
  { code: 'Asia/Bangkok',           label: 'Bangkok (ICT +7)' },
  { code: 'Asia/Jakarta',           label: 'Jakarta (WIB +7)' },
  { code: 'Australia/Sydney',       label: 'Sydney (AEST +10/11)' },
  { code: 'Australia/Melbourne',    label: 'Melbourne (AEST +10/11)' },
  { code: 'Pacific/Auckland',       label: 'Auckland (NZST +12/13)' },
  { code: 'America/New_York',       label: 'New York (EST/EDT)' },
  { code: 'America/Chicago',        label: 'Chicago (CST/CDT)' },
  { code: 'America/Denver',         label: 'Denver (MST/MDT)' },
  { code: 'America/Los_Angeles',    label: 'Los Angeles (PST/PDT)' },
  { code: 'America/Toronto',        label: 'Toronto (EST/EDT)' },
  { code: 'America/Sao_Paulo',      label: 'São Paulo (BRT -3)' },
  { code: 'Africa/Johannesburg',    label: 'Johannesburg (SAST +2)' },
  { code: 'Africa/Lagos',           label: 'Lagos (WAT +1)' },
  { code: 'Africa/Nairobi',         label: 'Nairobi (EAT +3)' },
  { code: 'Africa/Casablanca',      label: 'Casablanca (WET +1)' },
];

const LANGUAGES = [
  { code: 'en',    label: 'English',                metadata: { dir: 'ltr' } },
  { code: 'ar',    label: 'Arabic (العربية)',        metadata: { dir: 'rtl' } },
  { code: 'fr',    label: 'French (Français)',       metadata: { dir: 'ltr' } },
  { code: 'de',    label: 'German (Deutsch)',        metadata: { dir: 'ltr' } },
  { code: 'es',    label: 'Spanish (Español)',       metadata: { dir: 'ltr' } },
  { code: 'pt',    label: 'Portuguese (Português)', metadata: { dir: 'ltr' } },
  { code: 'zh-CN', label: 'Chinese Simplified (简体中文)', metadata: { dir: 'ltr' } },
  { code: 'zh-TW', label: 'Chinese Traditional (繁體中文)', metadata: { dir: 'ltr' } },
  { code: 'ja',    label: 'Japanese (日本語)',       metadata: { dir: 'ltr' } },
  { code: 'ko',    label: 'Korean (한국어)',          metadata: { dir: 'ltr' } },
  { code: 'ru',    label: 'Russian (Русский)',       metadata: { dir: 'ltr' } },
  { code: 'tr',    label: 'Turkish (Türkçe)',        metadata: { dir: 'ltr' } },
  { code: 'it',    label: 'Italian (Italiano)',      metadata: { dir: 'ltr' } },
  { code: 'nl',    label: 'Dutch (Nederlands)',      metadata: { dir: 'ltr' } },
  { code: 'pl',    label: 'Polish (Polski)',         metadata: { dir: 'ltr' } },
  { code: 'id',    label: 'Indonesian (Bahasa)',     metadata: { dir: 'ltr' } },
  { code: 'ms',    label: 'Malay (Bahasa Melayu)',  metadata: { dir: 'ltr' } },
  { code: 'th',    label: 'Thai (ภาษาไทย)',          metadata: { dir: 'ltr' } },
  { code: 'ur',    label: 'Urdu (اردو)',             metadata: { dir: 'rtl' } },
  { code: 'hi',    label: 'Hindi (हिंदी)',            metadata: { dir: 'ltr' } },
];

const UOMS = [
  // Count
  { code: 'EA',   label: 'Each',             metadata: { group: 'Count' } },
  { code: 'PR',   label: 'Pair',             metadata: { group: 'Count' } },
  { code: 'SET',  label: 'Set',              metadata: { group: 'Count' } },
  { code: 'PK',   label: 'Pack',             metadata: { group: 'Count' } },
  { code: 'BX',   label: 'Box',              metadata: { group: 'Count' } },
  { code: 'CS',   label: 'Case',             metadata: { group: 'Count' } },
  { code: 'LOT',  label: 'Lot',              metadata: { group: 'Count' } },
  // Weight
  { code: 'KG',   label: 'Kilogram',         metadata: { group: 'Weight' } },
  { code: 'G',    label: 'Gram',             metadata: { group: 'Weight' } },
  { code: 'LB',   label: 'Pound',            metadata: { group: 'Weight' } },
  { code: 'MT',   label: 'Metric Tonne',     metadata: { group: 'Weight' } },
  { code: 'T',    label: 'Short Ton',        metadata: { group: 'Weight' } },
  // Volume
  { code: 'L',    label: 'Litre',            metadata: { group: 'Volume' } },
  { code: 'ML',   label: 'Millilitre',       metadata: { group: 'Volume' } },
  { code: 'GAL',  label: 'Gallon',           metadata: { group: 'Volume' } },
  { code: 'M3',   label: 'Cubic Metre',      metadata: { group: 'Volume' } },
  // Length / Area
  { code: 'M',    label: 'Metre',            metadata: { group: 'Length' } },
  { code: 'CM',   label: 'Centimetre',       metadata: { group: 'Length' } },
  { code: 'KM',   label: 'Kilometre',        metadata: { group: 'Length' } },
  { code: 'FT',   label: 'Foot',             metadata: { group: 'Length' } },
  { code: 'M2',   label: 'Square Metre',     metadata: { group: 'Area' } },
  { code: 'SFT',  label: 'Square Foot',      metadata: { group: 'Area' } },
  // Time
  { code: 'HR',   label: 'Hour',             metadata: { group: 'Time' } },
  { code: 'DAY',  label: 'Day',              metadata: { group: 'Time' } },
  { code: 'WK',   label: 'Week',             metadata: { group: 'Time' } },
  { code: 'MON',  label: 'Month',            metadata: { group: 'Time' } },
  { code: 'YR',   label: 'Year',             metadata: { group: 'Time' } },
  // Service
  { code: 'SVC',  label: 'Service',          metadata: { group: 'Service' } },
  { code: 'JOB',  label: 'Job',              metadata: { group: 'Service' } },
  { code: 'LIC',  label: 'License',          metadata: { group: 'Service' } },
  { code: 'USR',  label: 'User / Seat',      metadata: { group: 'Service' } },
  { code: 'TRP',  label: 'Trip',             metadata: { group: 'Service' } },
];

const PAYMENT_TERMS = [
  { code: 'ADVANCE',  label: 'Advance Payment (100% upfront)' },
  { code: 'NET7',     label: 'Net 7 Days' },
  { code: 'NET15',    label: 'Net 15 Days' },
  { code: 'NET30',    label: 'Net 30 Days' },
  { code: 'NET45',    label: 'Net 45 Days' },
  { code: 'NET60',    label: 'Net 60 Days' },
  { code: 'NET90',    label: 'Net 90 Days' },
  { code: 'EOM',      label: 'End of Month' },
  { code: 'EOM15',    label: 'End of Month + 15 Days' },
  { code: 'EOM30',    label: 'End of Month + 30 Days' },
  { code: 'MILESTONE',label: 'Milestone-based' },
  { code: 'LC',       label: 'Letter of Credit (LC)' },
];

const INCOTERMS = [
  { code: 'EXW', label: 'EXW — Ex Works',                       metadata: { group: 'Any mode' } },
  { code: 'FCA', label: 'FCA — Free Carrier',                    metadata: { group: 'Any mode' } },
  { code: 'CPT', label: 'CPT — Carriage Paid To',               metadata: { group: 'Any mode' } },
  { code: 'CIP', label: 'CIP — Carriage & Insurance Paid To',   metadata: { group: 'Any mode' } },
  { code: 'DAP', label: 'DAP — Delivered At Place',             metadata: { group: 'Any mode' } },
  { code: 'DPU', label: 'DPU — Delivered At Place Unloaded',    metadata: { group: 'Any mode' } },
  { code: 'DDP', label: 'DDP — Delivered Duty Paid',            metadata: { group: 'Any mode' } },
  { code: 'FAS', label: 'FAS — Free Alongside Ship',            metadata: { group: 'Sea/inland' } },
  { code: 'FOB', label: 'FOB — Free On Board',                  metadata: { group: 'Sea/inland' } },
  { code: 'CFR', label: 'CFR — Cost & Freight',                 metadata: { group: 'Sea/inland' } },
  { code: 'CIF', label: 'CIF — Cost, Insurance & Freight',      metadata: { group: 'Sea/inland' } },
];

const SPEND_CATEGORIES = [
  { code: 'IT_HW',     label: 'IT Hardware',                    metadata: { group: 'Technology' } },
  { code: 'IT_SW',     label: 'IT Software & Licenses',         metadata: { group: 'Technology' } },
  { code: 'IT_SVC',    label: 'IT Services & Consulting',       metadata: { group: 'Technology' } },
  { code: 'TELECOM',   label: 'Telecommunications',             metadata: { group: 'Technology' } },
  { code: 'PROF_SVC',  label: 'Professional Services',          metadata: { group: 'Services' } },
  { code: 'LEGAL',     label: 'Legal & Compliance',             metadata: { group: 'Services' } },
  { code: 'HR',        label: 'Human Resources & Staffing',     metadata: { group: 'Services' } },
  { code: 'MKT',       label: 'Marketing & Advertising',        metadata: { group: 'Services' } },
  { code: 'TRAVEL',    label: 'Travel & Accommodation',         metadata: { group: 'Services' } },
  { code: 'FACILITIES',label: 'Facilities Management',          metadata: { group: 'Operations' } },
  { code: 'OFFICE',    label: 'Office Supplies & Equipment',    metadata: { group: 'Operations' } },
  { code: 'LOGISTICS', label: 'Logistics & Transportation',     metadata: { group: 'Operations' } },
  { code: 'ENERGY',    label: 'Energy & Utilities',             metadata: { group: 'Operations' } },
  { code: 'ENGR',      label: 'Engineering & Construction',     metadata: { group: 'Projects' } },
  { code: 'MFG',       label: 'Manufacturing & Production',     metadata: { group: 'Projects' } },
  { code: 'RAW_MAT',   label: 'Raw Materials',                  metadata: { group: 'Projects' } },
  { code: 'HEALTH',    label: 'Healthcare & Pharmaceuticals',   metadata: { group: 'Industry' } },
  { code: 'FOOD',      label: 'Food & Beverage',               metadata: { group: 'Industry' } },
  { code: 'AUTO',      label: 'Automotive & Vehicles',          metadata: { group: 'Industry' } },
  { code: 'RND',       label: 'Research & Development',         metadata: { group: 'Innovation' } },
  { code: 'FINANCE',   label: 'Finance & Banking Services',     metadata: { group: 'Finance' } },
  { code: 'INSURANCE', label: 'Insurance',                      metadata: { group: 'Finance' } },
  { code: 'PRINT',     label: 'Print & Publishing',             metadata: { group: 'Other' } },
  { code: 'OTHER',     label: 'Other / Miscellaneous',          metadata: { group: 'Other' } },
];

const DOCUMENT_TYPES = [
  { code: 'COMMERCIAL',   label: 'Commercial Proposal' },
  { code: 'TECHNICAL',    label: 'Technical Proposal' },
  { code: 'COMPANY_REG',  label: 'Company Registration / Trade License' },
  { code: 'TAX_CERT',     label: 'Tax Compliance Certificate' },
  { code: 'ISO_CERT',     label: 'ISO / Quality Certification' },
  { code: 'INSURANCE',    label: 'Insurance Certificate' },
  { code: 'FINANCIALS',   label: 'Financial Statements (Audited)' },
  { code: 'BANK_GUAR',    label: 'Bank Guarantee' },
  { code: 'BID_BOND',     label: 'Bid Bond / Tender Bond' },
  { code: 'NDA',          label: 'NDA / Confidentiality Agreement' },
  { code: 'REFERENCES',   label: 'Client References / Case Studies' },
  { code: 'CV_STAFF',     label: 'CVs / Key Personnel Profiles' },
  { code: 'METHODOLOGY',  label: 'Methodology / Work Plan' },
  { code: 'PRICE_SCHED',  label: 'Price Schedule / Bill of Quantities' },
  { code: 'OTHER',        label: 'Other / Supporting Document' },
];

const CONTRACT_TYPES = [
  { code: 'FRAMEWORK',  label: 'Framework Agreement' },
  { code: 'SPOT',       label: 'Spot / One-time Purchase' },
  { code: 'BLANKET_PO', label: 'Blanket Purchase Order' },
  { code: 'LONG_TERM',  label: 'Long-Term Supply Contract' },
  { code: 'SLA',        label: 'Service Level Agreement (SLA)' },
  { code: 'MSA',        label: 'Master Service Agreement (MSA)' },
  { code: 'BOQ',        label: 'Bill of Quantities Contract' },
  { code: 'LUMP_SUM',   label: 'Lump Sum / Fixed Price Contract' },
  { code: 'COST_PLUS',  label: 'Cost Plus Contract' },
  { code: 'TIME_MAT',   label: 'Time & Materials Contract' },
];

const AWARD_CRITERIA = [
  { code: 'MEAT',       label: 'Most Economically Advantageous Tender (MEAT)' },
  { code: 'LOWEST',     label: 'Lowest Price' },
  { code: 'BEST_VALUE', label: 'Best Value (Price + Quality)' },
  { code: 'TECH_SCORE', label: 'Highest Technical Score' },
  { code: 'NEGOTIATED', label: 'Negotiated Award' },
  { code: 'SOLE_SOURCE',label: 'Sole Source / Direct Award' },
];

const REJECTION_REASONS = [
  { code: 'HIGH_PRICE',   label: 'Price exceeds budget / not competitive' },
  { code: 'NON_COMPLY',   label: 'Non-compliant with requirements' },
  { code: 'INCOMPLETE',   label: 'Incomplete submission' },
  { code: 'LATE',         label: 'Submitted after deadline' },
  { code: 'QUAL_FAIL',    label: 'Failed qualification criteria' },
  { code: 'REFERENCES',   label: 'Insufficient references / experience' },
  { code: 'FINANCIAL',    label: 'Financial capacity concerns' },
  { code: 'BLACKLISTED',  label: 'Supplier is blacklisted / debarred' },
  { code: 'CONFLICT',     label: 'Conflict of interest identified' },
  { code: 'OTHER',        label: 'Other (see evaluation notes)' },
];

const EVALUATION_CRITERIA = [
  { code: 'PRICE',       label: 'Price / Cost',                  metadata: { defaultWeight: 40 } },
  { code: 'QUALITY',     label: 'Quality & Technical Compliance', metadata: { defaultWeight: 30 } },
  { code: 'DELIVERY',    label: 'Delivery / Lead Time',          metadata: { defaultWeight: 15 } },
  { code: 'EXPERIENCE',  label: 'Experience & References',       metadata: { defaultWeight: 10 } },
  { code: 'SUPPORT',     label: 'After-Sales Support & Warranty', metadata: { defaultWeight: 5 } },
  { code: 'INNOVATION',  label: 'Innovation & Value-Add' },
  { code: 'SUSTAIN',     label: 'Sustainability / ESG' },
  { code: 'LOCAL',       label: 'Local Content / Nationalisation' },
  { code: 'FINANCIAL',   label: 'Financial Stability' },
  { code: 'COMPLIANCE',  label: 'Regulatory & Legal Compliance' },
];

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...');

  // ── Platform config ────────────────────────────────────────────────────────
  await prisma.platformConfig.upsert({
    where: { key: 'platform_name' },
    update: {},
    create: { key: 'platform_name', value: JSON.stringify('eSourcing Platform'), description: 'Platform display name' },
  });
  await prisma.platformConfig.upsert({
    where: { key: 'default_currency' },
    update: {},
    create: { key: 'default_currency', value: JSON.stringify('USD'), description: 'Default currency for new organisations' },
  });

  // ── Demo organisation ──────────────────────────────────────────────────────
  const org = await prisma.organisation.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: { name: 'Demo Organisation', country: 'AE', subdomain: 'demo', defaultCurrency: 'USD', defaultLocale: 'en', buIsolation: false },
  });

  const buHQ = await prisma.businessUnit.upsert({
    where: { orgId_code: { orgId: org.id, code: 'BU-HQ' } },
    update: {},
    create: { orgId: org.id, name: 'Headquarters', code: 'BU-HQ', currency: 'USD' },
  });

  await prisma.businessUnit.upsert({
    where: { orgId_code: { orgId: org.id, code: 'BU-EU' } },
    update: {},
    create: { orgId: org.id, name: 'Europe Division', code: 'BU-EU', currency: 'EUR' },
  });

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@esourcing.com' },
    update: {},
    create: { email: 'admin@esourcing.com', passwordHash: await hashPassword('admin123'), firstName: 'Platform', lastName: 'Admin', status: 'ACTIVE', orgId: org.id },
  });

  const orgAdmin = await prisma.user.upsert({
    where: { email: 'orgadmin@demo.esourcing.com' },
    update: {},
    create: { email: 'orgadmin@demo.esourcing.com', passwordHash: await hashPassword('orgadmin123'), firstName: 'Org', lastName: 'Admin', status: 'ACTIVE', orgId: org.id },
  });

  const eventMgr = await prisma.user.upsert({
    where: { email: 'eventmgr@demo.esourcing.com' },
    update: {},
    create: { email: 'eventmgr@demo.esourcing.com', passwordHash: await hashPassword('eventmgr123'), firstName: 'Event', lastName: 'Manager', status: 'ACTIVE', orgId: org.id },
  });

  // ── Roles ──────────────────────────────────────────────────────────────────
  for (const [userId, role] of [
    [admin.id, 'PLATFORM_ADMIN'], [orgAdmin.id, 'ORG_ADMIN'], [eventMgr.id, 'EVENT_MANAGER'],
  ] as [string, string][]) {
    await prisma.userOrgRole.upsert({
      where: { userId_orgId_buId_role: { userId, orgId: org.id, buId: buHQ.id, role } },
      update: {},
      create: { userId, orgId: org.id, buId: buHQ.id, role },
    });
  }

  // ── Role permissions ───────────────────────────────────────────────────────
  const rolePermissions = [
    ...['ORG_CREATE','ORG_UPDATE','ORG_VIEW','BU_CREATE','BU_UPDATE','BU_VIEW',
        'USER_CREATE','USER_UPDATE','USER_VIEW','USER_ASSIGN_ROLE','USER_IMPERSONATE',
        'ADMIN_SETTINGS','ADMIN_AUDIT_LOG','MASTER_DATA_MANAGE',
        'SUPPLIER_VIEW','SUPPLIER_MANAGE'].map(p => ({ role: 'PLATFORM_ADMIN', permission: p })),
    ...['ORG_UPDATE','ORG_VIEW','BU_CREATE','BU_UPDATE','BU_VIEW',
        'USER_CREATE','USER_UPDATE','USER_VIEW','USER_ASSIGN_ROLE','ADMIN_SETTINGS',
        'ADMIN_AUDIT_LOG','MASTER_DATA_VIEW',
        'EVENT_VIEW','EVENT_CREATE','EVENT_UPDATE','EVENT_PUBLISH',
        'AUCTION_VIEW','AUCTION_CREATE','BID_VIEW_ALL',
        'EVAL_VIEW','EVAL_MANAGE','AWARD_VIEW','AWARD_APPROVE',
        'SUPPLIER_VIEW','SUPPLIER_MANAGE','CONTRACT_VIEW','CONTRACT_CREATE','CONTRACT_SIGN'].map(p => ({ role: 'ORG_ADMIN', permission: p })),
    ...['EVENT_CREATE','EVENT_UPDATE','EVENT_VIEW','EVENT_PUBLISH','AUCTION_CREATE',
        'AUCTION_START','AUCTION_VIEW','BID_VIEW_ALL','EVAL_MANAGE','AWARD_RECOMMEND',
        'SUPPLIER_VIEW','MASTER_DATA_VIEW','CONTRACT_VIEW','CONTRACT_CREATE'].map(p => ({ role: 'EVENT_MANAGER', permission: p })),
  ];
  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: rp.role, permission: rp.permission } },
      update: {},
      create: rp,
    });
  }

  // ── Master Data (Reference Data) ───────────────────────────────────────────
  console.log('  Seeding master data...');
  await seedRefData('CURRENCY',            CURRENCIES);
  await seedRefData('COUNTRY',             COUNTRIES);
  await seedRefData('TIMEZONE',            TIMEZONES);
  await seedRefData('LANGUAGE',            LANGUAGES);
  await seedRefData('UOM',                 UOMS);
  await seedRefData('PAYMENT_TERM',        PAYMENT_TERMS);
  await seedRefData('INCOTERM',            INCOTERMS);
  await seedRefData('SPEND_CATEGORY',      SPEND_CATEGORIES);
  await seedRefData('DOCUMENT_TYPE',       DOCUMENT_TYPES);
  await seedRefData('CONTRACT_TYPE',       CONTRACT_TYPES);
  await seedRefData('AWARD_CRITERIA',      AWARD_CRITERIA);
  await seedRefData('REJECTION_REASON',    REJECTION_REASONS);
  await seedRefData('EVALUATION_CRITERIA', EVALUATION_CRITERIA);

  // ── Additional User Personas ──────────────────────────────────────────────
  console.log('  Seeding additional users...');

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.esourcing.com' },
    update: {},
    create: { email: 'buyer@demo.esourcing.com', passwordHash: await hashPassword('buyer123'), firstName: 'Sarah', lastName: 'Al-Mansoori', status: 'ACTIVE', orgId: org.id },
  });

  const evaluator = await prisma.user.upsert({
    where: { email: 'evaluator@demo.esourcing.com' },
    update: {},
    create: { email: 'evaluator@demo.esourcing.com', passwordHash: await hashPassword('evaluator123'), firstName: 'Dr. Fatima', lastName: 'Hassan', status: 'ACTIVE', orgId: org.id },
  });

  const observer = await prisma.user.upsert({
    where: { email: 'observer@demo.esourcing.com' },
    update: {},
    create: { email: 'observer@demo.esourcing.com', passwordHash: await hashPassword('observer123'), firstName: 'Rania', lastName: 'Al-Sayed', status: 'ACTIVE', orgId: org.id },
  });

  // Assign roles for new users
  for (const [userId, role] of [
    [buyer.id, 'BUYER'], [evaluator.id, 'EVALUATOR'], [observer.id, 'OBSERVER'],
  ] as [string, string][]) {
    await prisma.userOrgRole.upsert({
      where: { userId_orgId_buId_role: { userId, orgId: org.id, buId: buHQ.id, role } },
      update: {},
      create: { userId, orgId: org.id, buId: buHQ.id, role },
    });
  }

  // ── Supplier Organisation + User ────────────────────────────────────────────
  console.log('  Seeding supplier organisation...');

  const supplierOrg = await prisma.organisation.upsert({
    where: { subdomain: 'acme-supplies' },
    update: {},
    create: { name: 'Acme Supplies Co.', country: 'AE', subdomain: 'acme-supplies', defaultCurrency: 'AED', supplierType: true },
  });

  const supplierBU = await prisma.businessUnit.upsert({
    where: { orgId_code: { orgId: supplierOrg.id, code: 'SUP-HQ' } },
    update: {},
    create: { orgId: supplierOrg.id, name: 'Supplier HQ', code: 'SUP-HQ', currency: 'AED' },
  });

  const supplierUser = await prisma.user.upsert({
    where: { email: 'ahmed@acme-supplies.com' },
    update: {},
    create: { email: 'ahmed@acme-supplies.com', passwordHash: await hashPassword('supplier123'), firstName: 'Ahmed', lastName: 'Khalil', status: 'ACTIVE', orgId: supplierOrg.id },
  });

  await prisma.userOrgRole.upsert({
    where: { userId_orgId_buId_role: { userId: supplierUser.id, orgId: supplierOrg.id, buId: supplierBU.id, role: 'SUPPLIER' } },
    update: {},
    create: { userId: supplierUser.id, orgId: supplierOrg.id, buId: supplierBU.id, role: 'SUPPLIER' },
  });

  // ── BUYER + EVALUATOR + SUPPLIER role permissions ────────────────────────
  const additionalRolePermissions = [
    ...['EVENT_VIEW','AUCTION_VIEW','AUCTION_CREATE','BID_VIEW_ALL','AWARD_RECOMMEND',
        'CONTRACT_VIEW','CONTRACT_CREATE','SUPPLIER_VIEW','SUPPLIER_MANAGE','EVENT_CREATE'].map(p => ({ role: 'BUYER', permission: p })),
    ...['EVENT_VIEW','EVAL_SCORE','EVAL_VIEW','EVAL_MANAGE','AWARD_VIEW',
        'BID_VIEW_ALL'].map(p => ({ role: 'EVALUATOR', permission: p })),
    ...['EVENT_VIEW','BID_SUBMIT','BID_VIEW_OWN','CONTRACT_VIEW',
        'CONTRACT_SIGN','AUCTION_VIEW'].map(p => ({ role: 'SUPPLIER', permission: p })),
    ...['EVENT_VIEW'].map(p => ({ role: 'OBSERVER', permission: p })),
  ];
  for (const rp of additionalRolePermissions) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: rp.role, permission: rp.permission } },
      update: {},
      create: rp,
    });
  }

  // ── Demo Auctions ───────────────────────────────────────────────────────────
  console.log('  Seeding demo auctions...');

  // Auction 1: DRAFT
  const auc1 = await prisma.auction.upsert({
    where: { id: '00000000-0000-0000-0000-000000000a01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000a01',
      orgId: org.id, buId: buHQ.id, refNumber: 'AUC-2026-DEMO-001',
      title: 'Office Furniture Procurement — Reverse Auction',
      description: 'Annual office furniture procurement for headquarters renovation.',
      auctionType: 'ENGLISH', status: 'DRAFT', currency: 'USD',
      startAt: new Date('2026-06-15T09:00:00Z'), endAt: new Date('2026-06-15T11:00:00Z'),
      reservePrice: 5000, startingPrice: 80000, decrementMin: 200, decrementMax: 10000,
      extensionMinutes: 5, extensionTriggerMinutes: 5, maxExtensions: 10,
      bidVisibility: 'RANK_ONLY', createdById: buyer.id,
    },
  });

  await prisma.auctionLot.upsert({
    where: { id: '00000000-0000-0000-0000-000000000l01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000l01',
      auctionId: auc1.id, orgId: org.id, lotNumber: 1, title: 'Standing Desks',
      reservePrice: 3000, startingPrice: 40000,
    },
  });

  // Auction 2: OPEN with bids
  const auc2 = await prisma.auction.upsert({
    where: { id: '00000000-0000-0000-0000-000000000a02' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000a02',
      orgId: org.id, buId: buHQ.id, refNumber: 'AUC-2026-DEMO-002',
      title: 'IT Equipment Procurement — Live Auction',
      description: 'Procurement of laptops, monitors, and networking equipment.',
      auctionType: 'ENGLISH', status: 'OPEN', currency: 'USD',
      startAt: new Date('2026-03-25T08:00:00Z'), endAt: new Date('2026-12-31T23:59:59Z'),
      reservePrice: 10000, startingPrice: 200000, decrementMin: 500,
      extensionMinutes: 5, extensionTriggerMinutes: 5,
      bidVisibility: 'RANK_AND_PRICE', createdById: eventMgr.id,
      publishedAt: new Date('2026-03-24T10:00:00Z'), openedAt: new Date('2026-03-25T08:00:00Z'),
    },
  });

  // Invite supplier to auction 2
  const inv2 = await prisma.auctionInvitation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000i01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000i01',
      auctionId: auc2.id, orgId: org.id, supplierId: supplierOrg.id,
      supplierEmail: 'ahmed@acme-supplies.com', supplierName: 'Acme Supplies Co.',
      status: 'ACCEPTED', token: 'demo-invitation-token-001',
      sentAt: new Date('2026-03-24T10:30:00Z'), respondedAt: new Date('2026-03-25T08:05:00Z'),
    },
  });

  // Place demo bids
  for (const [price, bidNum] of [[180000, 1], [165000, 2], [150000, 3], [142000, 4]] as [number, number][]) {
    await prisma.auctionBid.create({
      data: {
        auctionId: auc2.id, invitationId: inv2.id, orgId: org.id, supplierId: supplierOrg.id,
        bidPrice: price, currency: 'USD', rank: 1, status: 'ACTIVE', bidNumber: bidNum,
        placedAt: new Date(Date.now() - (5 - bidNum) * 3600000),
      },
    });
  }

  // Auction 3: CLOSED with final results
  await prisma.auction.upsert({
    where: { id: '00000000-0000-0000-0000-000000000a03' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000a03',
      orgId: org.id, buId: buHQ.id, refNumber: 'AUC-2026-DEMO-003',
      title: 'Catering Services Contract — Completed Auction',
      description: 'Catering services for corporate events and daily staff meals.',
      auctionType: 'ENGLISH', status: 'CLOSED', currency: 'USD',
      startAt: new Date('2026-03-10T09:00:00Z'), endAt: new Date('2026-03-10T11:00:00Z'),
      actualEndAt: new Date('2026-03-10T11:10:00Z'),
      reservePrice: 2000, startingPrice: 50000, decrementMin: 100,
      extensionMinutes: 5, extensionTriggerMinutes: 5, extensionCount: 2,
      bidVisibility: 'RANK_AND_PRICE', createdById: eventMgr.id,
      publishedAt: new Date('2026-03-09T10:00:00Z'), openedAt: new Date('2026-03-10T09:00:00Z'),
      closedAt: new Date('2026-03-10T11:10:00Z'),
    },
  });

  console.log('Seed complete.');
  console.log('  Demo org:', org.name, `(${org.subdomain})`);
  console.log('  Supplier org: Acme Supplies Co. (acme-supplies)');
  console.log('  ── Users ──');
  console.log('  Platform Admin:  admin@esourcing.com / admin123');
  console.log('  Org Admin:       orgadmin@demo.esourcing.com / orgadmin123');
  // ── Sample RFx Templates (one per event type) ──────────────────────────────
  const SAMPLE_TEMPLATES = [
    {
      name: 'Market Research — RFI',
      type: 'RFI',
      description: 'Gather supplier capabilities, market intelligence, and pricing indications before formal procurement.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Information Request', description: 'Supplier information gathering',
          lineItems: [
            { itemNumber: 1, description: 'Company Profile & Overview', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Organisation structure, history, financials' },
            { itemNumber: 2, description: 'Technical Capabilities Statement', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Technology stack, certifications, capacity' },
            { itemNumber: 3, description: 'Past Performance References', quantity: '3', uom: 'EA', targetPrice: '0', notes: 'Minimum 3 similar project references' },
            { itemNumber: 4, description: 'Indicative Pricing', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Rough order-of-magnitude pricing' },
          ],
        },
      ],
    },
    {
      name: 'Professional Services RFP',
      type: 'RFP',
      description: 'Engage consultants or service providers through a structured proposal evaluation process.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Technical Proposal', description: 'Methodology, team, and approach',
          lineItems: [
            { itemNumber: 1, description: 'Proposed Methodology & Approach', quantity: '1', uom: 'LOT', targetPrice: '0', notes: '' },
            { itemNumber: 2, description: 'Team CVs & Qualifications', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Key personnel resumes' },
            { itemNumber: 3, description: 'Detailed Project Plan', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Work breakdown structure' },
            { itemNumber: 4, description: 'Delivery Timeline & Milestones', quantity: '1', uom: 'LOT', targetPrice: '0', notes: '' },
          ],
        },
        {
          lotNumber: 2, title: 'Commercial Proposal', description: 'Pricing and payment terms',
          lineItems: [
            { itemNumber: 1, description: 'Professional Fee Structure', quantity: '1', uom: 'LOT', targetPrice: '0', notes: 'Day rates or fixed fees' },
            { itemNumber: 2, description: 'Payment Terms & Schedule', quantity: '1', uom: 'LOT', targetPrice: '0', notes: '' },
            { itemNumber: 3, description: 'Travel & Expense Estimates', quantity: '1', uom: 'LOT', targetPrice: '0', notes: '' },
          ],
        },
      ],
    },
    {
      name: 'IT Hardware Procurement — RFQ',
      type: 'RFQ',
      description: 'Purchase IT equipment including laptops, desktops, monitors, and peripherals at competitive prices.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Laptops & Desktops', description: 'Computing hardware',
          lineItems: [
            { itemNumber: 1, description: 'Laptop 14" (i7, 16GB RAM, 512GB SSD)', quantity: '100', uom: 'EA', targetPrice: '1200', notes: '3-year warranty required' },
            { itemNumber: 2, description: 'Desktop PC (i5, 16GB RAM, 256GB SSD)', quantity: '50', uom: 'EA', targetPrice: '800', notes: '' },
            { itemNumber: 3, description: 'Monitor 27" QHD IPS', quantity: '150', uom: 'EA', targetPrice: '350', notes: 'USB-C connectivity' },
          ],
        },
        {
          lotNumber: 2, title: 'Peripherals & Accessories', description: 'Input devices and docking',
          lineItems: [
            { itemNumber: 1, description: 'Wireless Keyboard & Mouse Combo', quantity: '150', uom: 'EA', targetPrice: '45', notes: '' },
            { itemNumber: 2, description: 'USB-C Headset with Noise Cancellation', quantity: '100', uom: 'EA', targetPrice: '80', notes: 'Teams/Zoom certified' },
            { itemNumber: 3, description: 'USB-C Docking Station', quantity: '100', uom: 'EA', targetPrice: '150', notes: 'Dual monitor support' },
          ],
        },
      ],
    },
    {
      name: 'Construction Works — ITT',
      type: 'ITT',
      description: 'Invite tenders for construction, civil works, or facility build-out projects.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Civil Works', description: 'Site preparation and structural construction',
          lineItems: [
            { itemNumber: 1, description: 'Site Preparation & Excavation', quantity: '1', uom: 'LOT', targetPrice: '50000', notes: '' },
            { itemNumber: 2, description: 'Foundation Works', quantity: '1', uom: 'LOT', targetPrice: '120000', notes: 'Reinforced concrete' },
            { itemNumber: 3, description: 'Structural Steel Frame', quantity: '500', uom: 'TON', targetPrice: '2500', notes: '' },
          ],
        },
        {
          lotNumber: 2, title: 'MEP Services', description: 'Mechanical, Electrical, and Plumbing',
          lineItems: [
            { itemNumber: 1, description: 'Electrical Installation', quantity: '1', uom: 'LOT', targetPrice: '80000', notes: 'Distribution boards, cabling, lighting' },
            { itemNumber: 2, description: 'Plumbing & Drainage', quantity: '1', uom: 'LOT', targetPrice: '45000', notes: '' },
            { itemNumber: 3, description: 'HVAC System', quantity: '1', uom: 'LOT', targetPrice: '95000', notes: 'VRF system with BMS integration' },
          ],
        },
      ],
    },
    {
      name: 'Office Supplies — Reverse Auction',
      type: 'REVERSE_AUCTION',
      description: 'Competitive real-time bidding for commodity office supplies. Lowest total price wins.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Office Supplies', description: 'Annual supply contract',
          lineItems: [
            { itemNumber: 1, description: 'A4 Copy Paper (80gsm, 5-ream box)', quantity: '500', uom: 'BOX', targetPrice: '22', notes: '' },
            { itemNumber: 2, description: 'Toner Cartridges (HP LaserJet compatible)', quantity: '200', uom: 'EA', targetPrice: '45', notes: '' },
            { itemNumber: 3, description: 'Pens & Stationery Pack', quantity: '300', uom: 'SET', targetPrice: '15', notes: 'Ballpoint, highlighters, markers' },
            { itemNumber: 4, description: 'Binders & Filing Folders', quantity: '400', uom: 'EA', targetPrice: '8', notes: 'A4 lever arch and ring binders' },
          ],
        },
      ],
    },
    {
      name: 'Fleet Vehicles — Dutch Auction',
      type: 'DUTCH_AUCTION',
      description: 'Procure fleet vehicles through descending-price auction. First supplier to accept the price wins.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Fleet Vehicles', description: 'Company vehicle procurement',
          lineItems: [
            { itemNumber: 1, description: 'Mid-Size Sedan (1.6L, automatic)', quantity: '10', uom: 'EA', targetPrice: '28000', notes: '2026 model year' },
            { itemNumber: 2, description: 'SUV (2.0L, 4WD, automatic)', quantity: '5', uom: 'EA', targetPrice: '42000', notes: 'With towing package' },
            { itemNumber: 3, description: 'Light Commercial Van', quantity: '3', uom: 'EA', targetPrice: '35000', notes: 'Long wheelbase' },
          ],
        },
      ],
    },
    {
      name: 'Catering Services — Japanese Auction',
      type: 'JAPANESE_AUCTION',
      description: 'Multi-round elimination bidding for corporate catering. Suppliers must opt in each round or be eliminated.',
      currency: 'USD',
      lotsJson: [
        {
          lotNumber: 1, title: 'Catering Package', description: '12-month catering contract for 500 employees',
          lineItems: [
            { itemNumber: 1, description: 'Daily Lunch Service (500 pax)', quantity: '260', uom: 'DAY', targetPrice: '12', notes: 'Per person per day' },
            { itemNumber: 2, description: 'Beverage Station (tea, coffee, water)', quantity: '260', uom: 'DAY', targetPrice: '3', notes: 'Per person per day' },
            { itemNumber: 3, description: 'Event Catering (quarterly town halls)', quantity: '4', uom: 'EVENT', targetPrice: '5000', notes: '500 attendees per event' },
            { itemNumber: 4, description: 'Special Dietary Requirements (Halal, Kosher, Vegan)', quantity: '260', uom: 'DAY', targetPrice: '2', notes: 'Premium per person' },
          ],
        },
      ],
    },
  ];

  for (const tpl of SAMPLE_TEMPLATES) {
    const existing = await prisma.rfxTemplate.findFirst({
      where: { orgId: org.id, name: tpl.name, isActive: true },
    });
    if (!existing) {
      await prisma.rfxTemplate.create({
        data: {
          orgId: org.id,
          name: tpl.name,
          type: tpl.type,
          description: tpl.description,
          currency: tpl.currency,
          lotsJson: tpl.lotsJson as any,
        },
      });
    }
  }
  console.log(`  ✓ ${SAMPLE_TEMPLATES.length} sample templates seeded`);

  console.log('  Event Manager:   eventmgr@demo.esourcing.com / eventmgr123');
  console.log('  Buyer:           buyer@demo.esourcing.com / buyer123');
  console.log('  Evaluator:       evaluator@demo.esourcing.com / evaluator123');
  console.log('  Observer:        observer@demo.esourcing.com / observer123');
  console.log('  Supplier:        ahmed@acme-supplies.com / supplier123');
  console.log('  ── Auctions ──');
  console.log('  AUC-2026-DEMO-001: DRAFT (Office Furniture)');
  console.log('  AUC-2026-DEMO-002: OPEN (IT Equipment, 4 bids)');
  console.log('  AUC-2026-DEMO-003: CLOSED (Catering Services)');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
