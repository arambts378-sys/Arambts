const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
// Use dotenv to load the secret securely from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SECRET) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env.local");
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, 'generated-qrs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generateAndVerify() {
  console.log("🛠️ Starting Development Certificate QR Generator...\n");

  const distances = ['3KM', '5KM'];
  const generatedTokens = {};

  for (const distance of distances) {
    // 1. Generate the exact same signature
    const base = `ARAM:CERT:${distance}`;
    const hmac = crypto.createHmac('sha256', SECRET).update(base).digest('hex');
    const token = `${base}:${hmac}`;
    generatedTokens[distance] = token;

    // Print payload type but NEVER the secret
    console.log(`[${distance}] Generating QR payload for distance: ${distance}`);
    console.log(`[${distance}] Payload format: ARAM:CERT:${distance}:<hmac-sha256>`);

    // 2. Save as PNG
    const fileName = `${distance.toLowerCase()}-certificate-qr.png`;
    const filePath = path.join(OUT_DIR, fileName);
    await QRCode.toFile(filePath, token, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    console.log(`[${distance}] ✅ Saved PNG to: scripts/generated-qrs/${fileName}`);
  }

  console.log("\n🔍 Verifying payloads against local validation endpoint...");
  
  for (const distance of distances) {
    const token = generatedTokens[distance];
    
    try {
      const res = await fetch('http://localhost:3000/api/certificates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`[${distance}] ❌ Validation endpoint returned HTTP ${res.status}: ${text}`);
        continue;
      }

      const data = await res.json();
      if (data.success && data.distance === distance) {
        console.log(`[${distance}] ✅ Validation passed! (Detected distance: ${data.distance})`);
      } else {
        console.error(`[${distance}] ❌ Validation failed or returned wrong distance:`, data);
      }
    } catch (err) {
      console.error(`[${distance}] ❌ Failed to connect to validation endpoint. Is Next.js running on localhost:3000?`, err.message);
    }
  }

  console.log("\n🎉 Done.");
}

generateAndVerify().catch(console.error);
