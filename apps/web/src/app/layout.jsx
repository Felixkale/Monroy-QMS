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
```

---

**Also, you have a second error:**
```
Module not found: Can't resolve '@/lib/supabaseClient'
