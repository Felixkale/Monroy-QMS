// apps/api/src/config/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

export const supabaseService = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
```

### Database Queries (replaces db.js)
All in the 7 service files:
```
apps/api/src/services/clients.service.ts
apps/api/src/services/sites.service.ts
apps/api/src/services/assets.service.ts
apps/api/src/services/inspections.service.ts
apps/api/src/services/ncr.service.ts
apps/api/src/services/certificates.service.ts
apps/api/src/services/alerts.service.ts
