import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Your experience · EmployHER',
  description: 'Review the evidence behind your next career step.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
