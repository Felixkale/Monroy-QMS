"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
      }
    };

    checkAuth();
  }, []);

  return <>{children}</>;
}
```

---

## 📍 HOW TO CREATE FILE ON GITHUB

1. Go to **https://github.com/Felixkale/Monroy-QMS**
2. Navigate to **apps/web/src/app/dashboard/**
3. Click **Add file** → **Create new file**
4. **Name:** `layout.tsx`
5. **Paste the code above**
6. **Commit with message:** `Add dashboard layout`

---

## 🎯 FILE STRUCTURE AFTER
```
apps/web/src/app/
├── layout.tsx              ✅ (root layout)
├── login/
│   └── page.tsx
└── dashboard/
    ├── layout.tsx          ✅ NEW (you're creating this)
    ├── page.tsx
    ├── assets/
    │   ├── page.tsx
    │   └── assets.css
    ├── sites/
    │   ├── page.tsx
    │   └── sites.css
    └── clients/
        └── page.tsx
