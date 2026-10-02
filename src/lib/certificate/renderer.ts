import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { parse } from 'opentype.js';

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
    const parsedFont = parse(fontArrayBuffer);
    
    const BASE_FONT_SIZE = 176;
    const MIN_FONT_SIZE = 30;
    const NAME_CENTER_X = 1708.6;
    const TARGET_BASELINE_Y = 1176;
    const NAME_MAX_WIDTH = 2100;
    
    let fontSize = BASE_FONT_SIZE;
    let measuredWidth = parsedFont.getAdvanceWidth(cleanName, fontSize);
    
    if (measuredWidth > NAME_MAX_WIDTH) {
        let low = MIN_FONT_SIZE;
        let high = BASE_FONT_SIZE;
        let bestSize = MIN_FONT_SIZE;

        while (low <= high) {
            const mid = (low + high) / 2;
            const w = parsedFont.getAdvanceWidth(cleanName, mid);
            if (w <= NAME_MAX_WIDTH) {
                bestSize = mid;
                low = mid + 0.05;
            } else {
                high = mid - 0.05;
            }
        }
        fontSize = Math.max(MIN_FONT_SIZE, Math.floor(bestSize * 100) / 100);
        measuredWidth = parsedFont.getAdvanceWidth(cleanName, fontSize);
    }

    // 4. Center the text mathematically
    const startX = NAME_CENTER_X - (measuredWidth / 2);

    // 5. Convert participant name to SVG paths
    const opentypePath = parsedFont.getPath(cleanName, startX, TARGET_BASELINE_Y, fontSize);
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

