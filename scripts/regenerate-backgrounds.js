const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function convert(pdfPath, outPath) {
  console.log(`Converting ${pdfPath} ...`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  
  // Render at scale 4.0 to achieve ~3367x2381
  const scale = 4.0;
  const viewport = page.getViewport({ scale });
  
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved ${outPath} at ${viewport.width}x${viewport.height}`);
}

async function run() {
  const rootDir = process.cwd();
  
  const pdf3km = path.join(rootDir, 'public', 'Walkathon Certificate 3 KM.pdf');
  const png3km = path.join(rootDir, 'public', 'certificate-bg-3km.png');
  if (fs.existsSync(pdf3km)) {
    await convert(pdf3km, png3km);
  } else {
    console.log(`Could not find ${pdf3km}`);
  }

  const pdf5km = path.join(rootDir, 'public', 'Walkathon Certificate 5 KM (1).pdf');
  const png5km = path.join(rootDir, 'public', 'certificate-bg-5km.png');
  if (fs.existsSync(pdf5km)) {
    await convert(pdf5km, png5km);
  } else {
    console.log(`Could not find ${pdf5km}`);
  }
}

run().catch(console.error);
