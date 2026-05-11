import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clinova — Clinical Intelligence Redefined',
  description: 'Next-gen AI-powered clinical decision support, FHIR-compliant EHR, and real-time patient monitoring platform. Trusted by 200+ hospitals worldwide.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0F1419] text-white min-h-screen custom-scrollbar">{children}</body>
    </html>
  );
}
