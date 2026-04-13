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

// ─── Simple .env Parser ───
const dotEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotEnvPath)) {
  console.log('📝 Found .env file, loading local configuration...');
  const dotEnvContent = fs.readFileSync(dotEnvPath, 'utf8');
  dotEnvContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove quotes if present
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const required = ['NINJA_API_KEY', 'ALPHA_VANTAGE_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.warn(`⚠️  Note: Missing environment variables: ${missing.join(', ')}`);
  console.warn('   Local development will use placeholders for these keys.');
}

const config = `/**
 * Aether Hub Configuration
 * Auto-generated at build time — do NOT edit manually.
 * Locally generated on: ${new Date().toISOString()}
 */
const CONFIG = {
  keys: {
    NINJA_API_KEY: '${process.env.NINJA_API_KEY || "LOCAL_DEV_PLACEHOLDER"}',
    ALPHA_VANTAGE_KEY: '${process.env.ALPHA_VANTAGE_KEY || "LOCAL_DEV_PLACEHOLDER"}',
    SUPABASE_URL: '${process.env.SUPABASE_URL || "LOCAL_DEV_PLACEHOLDER"}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || "LOCAL_DEV_PLACEHOLDER"}',
  },
  settings: {},
};
`;

const outPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outPath, config, 'utf8');
console.log(`✅ Generated js/config.js with ${required.length} keys`);
