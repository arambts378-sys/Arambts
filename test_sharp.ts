import sharp from 'sharp';

async function run() {
  const svgText = `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="blue"/>
      <text x="50%" y="50%" fill="white" font-size="24" text-anchor="middle" dominant-baseline="middle">Hello Ticket</text>
    </svg>
  `;
  const buffer = await sharp(Buffer.from(svgText)).png().toBuffer();
  console.log('Generated PNG of size', buffer.length);
}
run();
