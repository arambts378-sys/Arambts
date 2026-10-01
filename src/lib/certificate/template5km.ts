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
    
    // Wrap the base64 font in url() if it doesn't have it, otherwise fallback to absolute path
    const fontSrc = fontBase64 
        ? (fontBase64.startsWith('url') ? fontBase64 : `url('${fontBase64}')`)
        : "url('/fonts/Avingal.ttf')";
        
    // Dynamic font scaling
    const MAX_WIDTH = 1300;
    const AVG_CHAR_WIDTH_RATIO = 0.47;
    let fontSize = 176;
    const estimatedWidth = cleanName.length * fontSize * AVG_CHAR_WIDTH_RATIO;
    
    if (estimatedWidth > MAX_WIDTH) {
        fontSize = Math.floor(176 * (MAX_WIDTH / estimatedWidth));
        if (fontSize < 60) fontSize = 60; // minimum legible size
    }

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
        <image href="${backgroundUrl}" width="3367" height="2381" x="0" y="0" preserveAspectRatio="none" />
        
        <g text-anchor="middle">
          <!-- Participant Name -->
          <text 
            x="1708.6" 
            y="1176" 
            font-size="${fontSize}px" 
            font-family="Avingal"
            font-weight="400" 
            font-style="normal"
            text-decoration="none"
            fill="#e32c53" 
          >
            ${escapeXml(cleanName)}
          </text>
        </g>
      </svg>
    `;
};
