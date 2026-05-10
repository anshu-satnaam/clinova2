import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clinova — Healthcare AI Platform',
  description: 'Enterprise-grade AI-powered clinical decision support and FHIR-compliant EHR platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
