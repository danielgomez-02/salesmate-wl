export const metadata = {
  title: 'PHOTO_VERIFY API',
  description: 'Multi-tenant image verification backend for Salesmate Whitelabel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
