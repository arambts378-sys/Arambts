const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const OUT_DIR = path.join(__dirname, 'generated-qrs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generate() {
  console.log("🛠️ Starting Public Certificate QR Generator...\n");

  const certificates = [
    { url: 'https://arambts.vercel.app/certificate', fileName: 'certificate-qr.png' },
    { url: 'https://arambts.vercel.app/certificate/5km', fileName: 'certificate-5km-qr.png' }
  ];

  for (const cert of certificates) {
    console.log(`Generating QR payload for URL: ${cert.url}`);
    const filePath = path.join(OUT_DIR, cert.fileName);
    
    await QRCode.toFile(filePath, cert.url, {
      width: 800,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    console.log(`✅ Saved high-res QR PNG to: scripts/generated-qrs/${cert.fileName}`);
  }
  console.log("\n🎉 Done. This QR is safe for public printing and scanning by any camera.");
}

generate().catch(console.error);
