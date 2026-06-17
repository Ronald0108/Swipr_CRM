# SwiprCRM — Architecture & Execution Plan

> **Last updated:** 2026-06-17
>
> Multi-Tenant Architecture + Adapter Design Pattern.
> This plan accounts for the current codebase state and provides a sequential execution roadmap.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)              │
│  Landing Page ─── Dashboard (Rolodex) ─── Settings   │
│                         │                             │
│  Contexts: Auth │ Leads │ Activity │ CRM │ Import    │
└───────────────────────┬──────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │      SUPABASE BACKEND       │
         │  ┌───────────────────────┐  │
         │  │   Edge Functions      │  │
         │  │  ┌─────────────────┐  │  │
         │  │  │  CRM Factory    │  │  │
         │  │  │  ┌───────────┐  │  │  │
         │  │  │  │ HubSpot   │  │  │  │
         │  │  │  │ Adapter   │  │  │  │
         │  │  │  ├───────────┤  │  │  │
         │  │  │  │ Salesforce│  │  │  │
         │  │  │  │ Adapter   │  │  │  │
         │  │  │  └───────────┘  │  │  │
         │  │  └─────────────────┘  │  │
         │  └───────────────────────┘  │
         │                             │
         │  Database (Multi-Tenant)    │
         │  ┌───────────────────────┐  │
         │  │ organizations         │  │
         │  │ organization_members  │  │
         │  │ leads (org_id FK)     │  │
         │  │ lead_activities       │  │
         │  │ crm_connections       │  │
         │  │ billing_profiles      │  │
         │  └───────────────────────┘  │
         └─────────────────────────────┘
```

---

## Phase 0: Code Cleanup & Foundation (Week 1)

> Before adding features, fix structural debt.

### 0.1 Break up `providers.tsx` (964 lines → 6 focused contexts)

| New File | Responsibility |
|---|---|
| `contexts/AuthContext.tsx` | Session, login, logout |
| `contexts/LeadsContext.tsx` | Leads CRUD, navigation, search |
| `contexts/ActivityContext.tsx` | Activity log, stats |
| `contexts/ModalContext.tsx` | All modal state |
| `contexts/CrmContext.tsx` | CRM connections, sync |
| `contexts/ImportContext.tsx` | CSV import |

### 0.2 Fix Supabase client
- Install `@supabase/ssr`
- Create browser + server client helpers
- Remove production `console.log`

### 0.3 Extract dashboard sub-components
Break `dashboard/page.tsx` (737 lines) into: `ImportModal`, `CrmModal`, `DeleteConfirmDialog`, `LeadSearchPanel`, `StatsBar`, `ActivitySidebar`, `KeyboardLegend`.

### 0.4 Fix dark mode
Add `dark:` variants to `LeadCard`, `NotesModal`, `EmailDraftModal`.

### 0.5 Remove unused dependencies
Remove: `@mui/*`, `@emotion/*`, `react-dnd`, `react-popper`, `react-slick`, `react-responsive-masonry`, `@popperjs/core`.

### 0.6 Quick fixes
- Fix `require()` → `import` in providers
- Fix `lead_activities.lead_id` type (text → uuid with FK)
- Fix "Return to Scroll Page" → `/dashboard`
- Delete unused `CallPanel.tsx`
- Fix LinkedIn placeholder href
- Move logos to `public/images/`
- Add viewport meta, error boundaries
- Type `actionMeta` properly
- Extract `CallNoticeToast` to shared component

---

## Phase 1: Multi-Tenant Database Schema (Weeks 2-3)

> Transform from single-user to organization-based architecture.

### Database Tables

**`organizations`** — The parent entity.
```
id, name, slug (unique), billing_plan, created_at, updated_at
```

**`organization_members`** — Users belong to orgs.
```
id, organization_id (FK), user_id (FK → auth.users), role ('admin' | 'rep'),
invited_at, joined_at
```

### Migration Steps
1. Create `organizations` and `organization_members` tables
2. Auto-create an org for each existing user
3. Add `organization_id` FK to: `leads`, `lead_activities`, `crm_connections`, `crm_sync_runs`
4. Update RLS policies to scope by org membership
5. Update all frontend queries to include `organization_id`

> **Key insight:** An Admin connects HubSpot once → all 10 reps start swiping without configuring anything.

---

## Phase 2: CRM Adapter Pattern (Weeks 3-4)

> Future-proof backend design. Never hardcode CRM logic into UI components.

### Universal Interface
```typescript
interface CRMAdapter {
  fetchContacts(limit: number): Promise<Contact[]>;
  pushContacts(contacts: Contact[]): Promise<SyncResult>;
  disconnect(): Promise<void>;
}
```

### File Structure
```
supabase/functions/_shared/adapters/
├── types.ts        # CRMAdapter interface, Contact, SyncResult types
├── hubspot.ts      # class HubSpotAdapter implements CRMAdapter
├── factory.ts      # getCrmAdapter(provider, token) → CRMAdapter
```

### Factory Pattern
```typescript
function getCrmAdapter(provider: string, accessToken: string): CRMAdapter {
  switch (provider) {
    case 'hubspot':  return new HubSpotAdapter(accessToken);
    case 'salesforce': return new SalesforceAdapter(accessToken);
    default: throw new Error(`Unsupported CRM: ${provider}`);
  }
}
```

### Refactor existing Edge Functions
- `hubspot-import-contacts` → `factory.getCrmAdapter('hubspot', token).fetchContacts()`
- `hubspot-export-contacts` → `adapter.pushContacts()`
- `hubspot-sync-contacts` → orchestrates both directions

---

## Phase 3: Integrations Settings UI (Weeks 4-5)

### Admin-Only Settings Page (`/settings/integrations`)

**UI:** Grid of CRM provider cards.
- HubSpot → **Active** (Connect / Disconnect / Sync buttons)
- Salesforce → **"Coming Soon"** badge
- Pipedrive → **"Coming Soon"** badge

**Access Control:**
- Only users with `role: 'admin'` can access settings pages
- Implement middleware or context-based route guards

**OAuth Flow:**
1. Admin clicks "Connect HubSpot"
2. Redirects to HubSpot OAuth
3. Callback saves token to `crm_connections` under `organization_id`
4. All org members instantly get CRM sync access

---

## Phase 4: Team Management (Weeks 5-7)

### Admin Dashboard (`/settings/team`)
- View all org members, roles, activity stats
- Invite reps via email (Supabase Auth magic link)
- Remove members, change roles (admin ↔ rep)

### Lead Assignment
- Add `assigned_to` column on `leads` table
- When admin assigns in SwiprCRM → update HubSpot owner via adapter
- Rep rolodex shows assigned leads (configurable: assigned-only vs all)

### Activity Aggregation
- Admin sees activity across all reps
- Per-rep stats: leads processed, connected %, daily velocity

---

## Phase 5: Horizontal CRM Expansion (Week 8+)

> Now that the foundation is bulletproof, adding a new CRM takes days, not weeks.

### Adding Salesforce
1. Write `SalesforceAdapter` implementing the universal interface
2. Add Salesforce OAuth Edge Function
3. Add "Connect Salesforce" card to settings UI
4. The rest of the app doesn't change at all

### Future: Pipedrive, Zoho, Close, etc.
Each new CRM = one adapter class + one OAuth flow + one UI card.

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 4 + custom CSS |
| Animations | Motion (Framer Motion) |
| Auth & DB | Supabase (Auth + Postgres + Edge Functions) |
| Payments | Stripe (webhook + checkout sessions) |
| Icons | Lucide React |
| Theming | next-themes |