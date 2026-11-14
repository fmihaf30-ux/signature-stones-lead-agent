const path = require('path');
const fs = require('fs');

const ENV_PATH = path.join(__dirname, '.env');

function getConfig() {
  require('dotenv').config({ path: ENV_PATH, override: true });
  const e = process.env;
  return {
    port: Number(e.PORT || 3000),
    business: e.BUSINESS_NAME || 'Signature Stones Uganda',
    tiktok: e.BUSINESS_TIKTOK || 'https://www.tiktok.com/@signaturestonesuganda',
    dispatcherPhone: (e.WHATSAPP_DISPATCHER_PHONE || '').trim(),
    managerPhone: (e.SALES_MANAGER_PHONE || '').trim(),
    managerName: e.SALES_MANAGER_NAME || 'Sales Manager',
    managerEmail: (e.SALES_MANAGER_EMAIL || '').trim(),
    smtpEmail: (e.SMTP_EMAIL || '').trim(),
    smtpPass: (e.SMTP_APP_PASSWORD || '').replace(/\s+/g, ''),
    geminiKey: (e.GEMINI_API_KEY || '').trim(),
    geminiModel: e.GEMINI_MODEL || 'gemini-2.5-flash',
    waToken: (e.WA_CLOUD_TOKEN || '').trim(),
    waPhoneId: (e.WA_PHONE_NUMBER_ID || '').trim(),
    waVerify: e.WA_VERIFY_TOKEN || 'signature-stones-verify',
    waTemplate: (e.WA_PITCH_TEMPLATE || '').trim(),
    waTemplateLang: e.WA_TEMPLATE_LANG || 'en',
    autoMinutes: Math.max(5, Number(e.AUTO_CYCLE_MINUTES || 30))
  };
}

const hasCloudApi = c => Boolean(c.waToken && c.waPhoneId);
const hasSmtp = c => Boolean(c.smtpEmail && c.smtpPass);

/** Updates (or adds) KEY="value" lines in .env */
function updateEnv(pairs) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  for (const [key, value] of Object.entries(pairs)) {
    if (value === undefined) continue;
    const line = `${key}="${String(value).replace(/"/g, '')}"`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

module.exports = { getConfig, hasCloudApi, hasSmtp, updateEnv };
