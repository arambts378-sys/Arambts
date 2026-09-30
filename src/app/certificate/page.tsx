import React from 'react';
import dynamic from 'next/dynamic';

const CertificateClient = dynamic(() => import('./CertificateClient'), { ssr: false });

export const metadata = {
  title: 'ARAM BTS Certificate',
  description: 'Download your official ARAM BTS certificate.'
};

export default function CertificatePage() {
  return <CertificateClient />;
}
