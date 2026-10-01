// src/lib/certificate/template5km.ts

// Helper to sanitize XML strings for SVG
export const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

export const getCertificate5kmSvg = (name: string, backgroundUrl: string = '/certificate-bg-5km.png', fontBase64: string = ''): string => {
    const cleanName = name.trim() || 'Your Name';
    
    // Use provided base64 font for server-side Sharp generation, or absolute path for client-side browser preview
    const fontSrc = fontBase64 || "url('/fonts/Avingal.ttf')";

    return `
      <svg width="3367" height="2381" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3367 2381">
        <defs>
          <style>
            @font-face {
              font-family: "Avingal";
              src: ${fontSrc} format("truetype");
              font-weight: 400;
              font-style: normal;
            }
          </style>
        </defs>
        <image href="${backgroundUrl}" width="3367" height="2381" x="0" y="0" />
        
        <g text-anchor="middle">
          <!-- Participant Name -->
          <text 
            x="1708.6" 
            y="1176" 
            font-size="176px" 
            font-family="Avingal"
            font-weight="400" 
            font-style="normal"
            text-decoration="none"
            fill="#e32c53" 
            textLength="${cleanName.length > 25 ? '2000' : ''}"
            lengthAdjust="spacingAndGlyphs"
          >
            ${escapeXml(cleanName)}
          </text>
        </g>
      </svg>
    `;
};
