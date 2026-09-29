import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';

async function run() {
  const qrSvg = await QRCode.toString('TestToken123', {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // Extract just the path elements from the QR SVG so we can embed it
  const qrInner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>([\s\S]*?)<\/svg>[\s\S]*$/, '$1');

  const ticketSvg = `
    <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7A1F3D;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="600" height="300" rx="15" ry="15" fill="white" stroke="#e5e7eb" stroke-width="2"/>
      
      <!-- Accent Header -->
      <path d="M 0 15 Q 0 0 15 0 L 585 0 Q 600 0 600 15 L 600 60 L 0 60 Z" fill="url(#grad1)"/>
      <text x="30" y="35" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">ARAM BTS - EVENT TICKET</text>
      
      <!-- Event Details -->
      <text x="30" y="110" fill="#6b7280" font-family="Arial, sans-serif" font-size="14" font-weight="bold">EVENT</text>
      <text x="30" y="140" fill="#1f2937" font-family="Arial, sans-serif" font-size="22" font-weight="bold">Coconut Shell Crafts</text>
      
      <text x="30" y="190" fill="#6b7280" font-family="Arial, sans-serif" font-size="14" font-weight="bold">ATTENDEE</text>
      <text x="30" y="215" fill="#1f2937" font-family="Arial, sans-serif" font-size="18">Santhosh S</text>

      <text x="30" y="260" fill="#6b7280" font-family="Arial, sans-serif" font-size="14" font-weight="bold">REGISTRATION #</text>
      <text x="30" y="280" fill="#4F46E5" font-family="Arial, sans-serif" font-size="16" font-weight="bold">ARAM-REG-123456</text>
      
      <!-- Divider -->
      <line x1="400" y1="60" x2="400" y2="300" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="8,8"/>
      
      <!-- QR Code area -->
      <g transform="translate(420, 80)">
        <rect width="160" height="160" fill="white"/>
        <g transform="scale(3.5)">
           ${qrInner}
        </g>
      </g>
      
      <text x="500" y="270" fill="#6b7280" font-family="Arial, sans-serif" font-size="12" text-anchor="middle">SCAN FOR ACCESS</text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(ticketSvg)).png().toBuffer();
  fs.writeFileSync('ticket_test.png', buffer);
  console.log('Ticket generated!');
}
run();
