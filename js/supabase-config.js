/**
 * Supabase Configuration
 * Farm Phoomjai & Jiaranai Garden
 * 
 * ใส่ค่า SUPABASE_URL และ SUPABASE_ANON_KEY จาก Supabase Dashboard
 * Settings → API → Project URL และ anon public key
 */

const SUPABASE_URL = 'https://itznnbmvbgqvotidygdo.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE'; // ← ใส่ anon public key ที่นี่ (ขึ้นต้นด้วย eyJ...)

// สร้าง Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
