import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import * as opentype from 'opentype.js';

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function generateCertificatePng({
    type,
    name
}: {
    type: "standard" | "5KM";
    name: string;
}): Promise<Buffer> {
    const cleanName = name.trim();
    
    // 1. Load Background Image
    const bgFilename = type === "5KM" ? 'certificate-bg-5km.png' : 'certificate-bg-3km.png';
    const bgPath = path.join(process.cwd(), 'public', bgFilename);
    const bgBuffer = await fs.readFile(bgPath);
    
    // 2. Load Font
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Avingal.ttf');
    const fontBuffer = await fs.readFile(fontPath);
    const fontBase64 = `data:font/ttf;charset=utf-8;base64,${fontBuffer.toString('base64')}`;
    
    // 3. Measure text and calculate proportional font size
    const fontArrayBuffer = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
    const parsedFont = opentype.parse(fontArrayBuffer);
    
    const BASE_FONT_SIZE = 176;
    const MAX_WIDTH = 1300;
    
    const measuredWidth = parsedFont.getAdvanceWidth(cleanName, BASE_FONT_SIZE);
    
    let fontSize = BASE_FONT_SIZE;
    if (measuredWidth > MAX_WIDTH) {
        fontSize = BASE_FONT_SIZE * (MAX_WIDTH / measuredWidth);
        // Ensure it doesn't get ridiculously small, but follow proportionality
        if (fontSize < 30) fontSize = 30;
    }

    // 4. Generate transparent SVG with only the text
    const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="3367" height="2381">
  <defs>
    <style>
      @font-face {
        font-family: 'Avingal';
        src: url('${fontBase64}') format('truetype');
        font-weight: 400;
        font-style: normal;
      }
    </style>
  </defs>
  <text 
    x="1708.6" 
    y="1176" 
    text-anchor="middle" 
    font-family="Avingal" 
    font-size="${fontSize}px" 
    fill="#e32c53"
  >${escapeXml(cleanName)}</text>
</svg>`;

    // 5. Composite text over background
    const finalPngBuffer = await sharp(bgBuffer)
        .composite([
            {
                input: Buffer.from(textSvg),
                top: 0,
                left: 0
            }
        ])
        .png()
        .toBuffer();

    return finalPngBuffer;
}
