import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { parse as parseFont } from 'opentype.js';

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
    
    // 3. Measure text and calculate proportional font size
    const fontArrayBuffer = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
    const parsedFont = parseFont(fontArrayBuffer);
    
    const BASE_FONT_SIZE = 176;
    const MAX_WIDTH = 1300;
    
    let fontSize = BASE_FONT_SIZE;
    let measuredWidth = parsedFont.getAdvanceWidth(cleanName, fontSize);
    
    if (measuredWidth > MAX_WIDTH) {
        fontSize = BASE_FONT_SIZE * (MAX_WIDTH / measuredWidth);
        if (fontSize < 30) fontSize = 30; // safety bound
        // Remeasure with the new font size
        measuredWidth = parsedFont.getAdvanceWidth(cleanName, fontSize);
    }

    // 4. Center the text mathematically
    const targetCenterX = 1708.6;
    const targetBaselineY = 1176;
    const startX = targetCenterX - (measuredWidth / 2);

    // 5. Convert participant name to SVG paths
    const opentypePath = parsedFont.getPath(cleanName, startX, targetBaselineY, fontSize);
    const pathData = opentypePath.toPathData(2);

    // 6. Generate transparent SVG with only the vector path
    const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="3367" height="2381">
  <path d="${pathData}" fill="#e32c53" />
</svg>`;

    // 7. Composite path over background
    const finalPngBuffer = await sharp(bgBuffer)
        .composite([
            {
                input: Buffer.from(textSvg),
                top: 0,
                left: 0
            }
        ])
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
        .toBuffer();

    return finalPngBuffer;
}
