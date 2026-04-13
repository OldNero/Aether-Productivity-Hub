/**
 * Cloudflare Pages Build Script
 * Generates js/config.js from environment variables at deploy time.
 * 
 * Required env vars (set in Cloudflare Pages dashboard):
 *   NINJA_API_KEY
 *   ALPHA_VANTAGE_KEY
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */

const fs = require('fs');
const path = require('path');

const required = ['NINJA_API_KEY', 'ALPHA_VANTAGE_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
  console.error('   Set these in Cloudflare Pages → Settings → Environment Variables');
  process.exit(1);
}

const config = `/**
 * Aether Hub Configuration
 * Auto-generated at build time — do NOT edit manually.
 */
const CONFIG = {
  keys: {
    NINJA_API_KEY: '${process.env.NINJA_API_KEY}',
    ALPHA_VANTAGE_KEY: '${process.env.ALPHA_VANTAGE_KEY}',
    SUPABASE_URL: '${process.env.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}',
  },
  settings: {},
};
`;

const outPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outPath, config, 'utf8');
console.log(`✅ Generated js/config.js with ${required.length} keys`);
