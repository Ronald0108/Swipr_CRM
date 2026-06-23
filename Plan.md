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

## Phase 1: Create the HubSpot Developer App (The Setup)

1. **Create a Developer Account:** Go to developers.hubspot.com and create a free account.
2. **Create an App:** Inside your developer workspace, click "Create an app". Name it "SwiprCRM".
3. **Get Your Keys:** Go to the Auth tab in your app settings. You will see a Client ID and a Client Secret. Keep this page open.
4. **Set the Scopes:** Under the "Scopes" section, add the following:
   - `crm.objects.contacts.read` (To pull leads into SwiprCRM)
   - `crm.objects.contacts.write` (To update leads when a user swipes)
5. **Set the Redirect URI:** Under "Redirect URLs", add:
   - Local testing: `http://localhost:3000/api/auth/callback/hubspot`
   - Production (Vercel): `https://your-domain.com/api/auth/callback/hubspot`

---

## Phase 2: Secure Your Environment Variables

Add these to your `.env.local` file (and later, to your Vercel project settings):

```env
HUBSPOT_CLIENT_ID=your_client_id_here
HUBSPOT_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Phase 3: The Next.js Integration Code

### 1. The Authorization Route (`app/api/auth/hubspot/route.ts`)
This route constructs the specific URL and redirects the user to HubSpot's secure login screen.

### 2. The Callback Route (`app/api/auth/callback/hubspot/route.ts`)
When the user approves SwiprCRM, HubSpot redirects them here with a temporary `code`. We instantly trade that code for the permanent `access_token` and store it securely in the `integrations` (or `crm_connections`) table under their `organization_id`.

---

## Phase 4: Connecting the UI

### Admin-Only Settings Page (`/dashboard/settings/integrations`)
Create a button that points to `/api/auth/hubspot`. Once this is done, you will have successfully connected a company's HubSpot database to your Supabase backend.

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