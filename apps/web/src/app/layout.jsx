import './globals.css'

export const metadata = {
  title: 'Monroy QMS',
  description: 'Quality Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
