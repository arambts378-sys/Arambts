import { escapeXml } from './template';

export const getCertificate5kmSvg = (name: string): string => {
    const cleanName = name.trim() || 'Your Name';
    const eventDate = 'November 15, 2026';
    const certNumber = 'BTS-5KM-2026'; // For preview/general display

    return `
      <svg width="1123" height="794" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794">
        <rect width="1123" height="794" fill="#ffffff"/>
        
        <!-- Border -->
        <rect x="20" y="20" width="1083" height="754" fill="none" stroke="#10B981" stroke-width="10"/>
        <rect x="30" y="30" width="1063" height="734" fill="none" stroke="#E5E7EB" stroke-width="2"/>
        
        <!-- Background Decor -->
        <circle cx="0" cy="0" r="300" fill="#10B981" opacity="0.05" />
        <circle cx="1123" cy="794" r="400" fill="#10B981" opacity="0.05" />

        <g text-anchor="middle" font-family="Arial, sans-serif">
          <!-- Header -->
          <text x="561" y="150" font-size="28" font-weight="bold" fill="#10B981" letter-spacing="4">ARAM BTS 5KM RUN</text>
          
          <text x="561" y="240" font-size="48" font-weight="900" fill="#111827">CERTIFICATE OF COMPLETION</text>
          
          <text x="561" y="330" font-size="20" fill="#6B7280" font-style="italic">This certificate is proudly presented to</text>
          
          <!-- Participant Name -->
          <text x="561" y="420" font-size="44" font-weight="bold" fill="#111827">${escapeXml(cleanName)}</text>
          
          <!-- Line under name -->
          <line x1="361" y1="440" x2="761" y2="440" stroke="#E5E7EB" stroke-width="2" />
          
          <text x="561" y="500" font-size="20" fill="#6B7280">for successfully completing the</text>
          
          <text x="561" y="560" font-size="28" font-weight="bold" fill="#10B981">5KM Event</text>
        </g>
        
        <!-- Footer -->
        <g font-family="Arial, sans-serif" font-size="16" fill="#6B7280">
          <text x="100" y="680" font-weight="bold">Certificate No:</text>
          <text x="100" y="710" fill="#111827">${certNumber}</text>
          
          <text x="900" y="680" font-weight="bold">Date:</text>
          <text x="900" y="710" fill="#111827">${eventDate}</text>
        </g>
      </svg>
    `;
};
