import { NextResponse } from 'next/server';
import { generateCertificatePng } from '@/lib/certificate/renderer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const name = searchParams.get('name');

    if (!type || (type !== 'standard' && type !== '5KM')) {
      return new NextResponse('Invalid or missing type', { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      // Return a 1x1 transparent PNG if no name is provided so the img tag doesn't break
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );
      return new NextResponse(transparentPixel, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' }
      });
    }

    const pngBuffer = await generateCertificatePng({
      type,
      name: name.trim()
    });

    return new NextResponse(pngBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Preview error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
