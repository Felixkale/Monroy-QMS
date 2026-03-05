import './globals.css'  // or wherever your global styles are

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
```

**Your structure should then be:**
```
src/apps/web/app/
  ├── layout.jsx              ← ROOT layout (wraps everything)
  ├── login/
  │   └── page.jsx
  ├── dashboard/
  │   ├── layout.jsx          ← Dashboard-specific layout (optional, nested)
  │   └── pages...
