# CallOHM Admissions - Product Architecture & Flow Plan

> Version 1.0 | Status: Planning | Stack: React 19 + Vite + Tailwind (Frontend)

---

## 1. Product Vision

CallOHM Admissions is a multi-tenant, AI-assisted outbound calling platform built for the education sector. It enables colleges (tenants) to run structured admissions campaigns - calling prospective students, capturing post-call outcomes, managing follow-ups, and analyzing the full recruitment funnel from first contact to enrollment visit.

---

## 2. User Roles & Permissions

### 2.1 SuperAdmin (Purview / Platform Owner)
- Owns the entire platform
- Creates, updates, deactivates colleges (tenants)
- Assigns Admin credentials to each college
- Views all companies, contacts, and campaigns across all colleges
- Manages global telephony provider pool
- Access to platform-wide analytics and audit logs
- Can impersonate any college admin for support purposes

### 2.2 Admin (College)
- Scoped to their own college only
- Cannot see other colleges' data
- Manages their own contacts, campaigns, telephony, and agents
- Creates and manages call agents (sub-users) within the college
- Views college-level analytics and reports
- Manages their telephony provider configuration

### 2.3 Agent (Sub-user under College Admin)
- Makes outbound calls within assigned campaigns
- Captures call outcomes and notes
- Views only their assigned contacts and campaigns
- Cannot change settings or access analytics

---

## 3. Module Overview

```
CallOHM Admissions
├── Auth & Tenant Management
├── Dashboard
├── Contacts & Companies
├── Telephony Configuration
├── Campaigns
│   ├── Campaign Builder
│   ├── Call Execution
│   └── Call Disposition (Post-Call Form)
├── Follow-Up Management
├── Analytics & Reports
├── Data Import / Export
├── Settings
└── Audit Logs
```

---

## 4. Detailed Module Breakdown

---

### 4.1 Auth & Tenant Management

**Authentication Flow:**
1. Login page (single, role-aware)
2. JWT-based auth with refresh tokens (access token: 15 min, refresh: 7 days)
3. Role is embedded in token - route guards enforce access on both frontend and backend
4. Password reset via email OTP

**SuperAdmin - Tenant Management:**
- Create College (Name, Address, Logo, Admin Email, Plan/Tier)
- Edit / Deactivate College
- Assign or reset Admin credentials
- View all colleges in a table with status (active / inactive / trial)
- Usage overview per college (contacts count, campaigns run, calls made)

**Session Management:**
- Automatic logout on token expiry
- Concurrent session control (optional: one active session per user)
- Audit trail on every login / logout

---

### 4.2 Dashboard

**SuperAdmin Dashboard:**
- Total colleges (active / inactive)
- Total contacts across platform
- Total campaigns running / completed today
- Total calls made today vs. this month
- Top performing colleges (by conversion rate)
- System health: telephony provider status, queue depth

**Admin (College) Dashboard:**
- Today's call targets vs. completed
- Campaign progress bars (per active campaign)
- Agent performance snapshot (calls/hour, pickup rate)
- Funnel summary: Contacted → Interested → Visit Scheduled → Enrolled
- Pending follow-ups count (overdue highlighted)
- Quick actions: Start Campaign, Import Contacts, View Reports

---

### 4.3 Contacts & Companies

**Data Hierarchy:**
```
Company (Institution / School / Lead Source)
  └── Contact (Individual Prospective Student or Parent)
```

**SuperAdmin View:**
- All Companies across all colleges (with college tag)
- Drill down: Company → Contacts under that company
- Filter by college, status, creation date, campaign tag

**Admin (College) View:**
- Only their college's companies and contacts
- Cannot see other colleges' data
- Full CRUD on companies and contacts

**Contact Fields:**
- Full Name, Phone (primary + alternate), Email
- Course Interest (dropdown - pre-configured per college)
- Lead Source (walk-in, referral, web form, import, campaign)
- Current Status (New, Contacted, Interested, Not Interested, Do Not Call, Enrolled)
- Assigned Agent
- Tags (free-form labels)
- Notes (timestamped, agent-authored)
- Call history (linked automatically)

**Company Fields:**
- Company / School Name
- City, State
- Type (School, Coaching Center, Corporate, Other)
- Primary Contact Person
- Tags

**Contact List Features:**
- Search (name, phone, email)
- Filters: status, lead source, campaign, agent, date range
- Bulk actions: assign agent, add to campaign, export, delete
- DNC (Do Not Call) flag - prevents contact from being dialed in any campaign
- Duplicate detection on phone number at import and manual create

---

### 4.4 Telephony Configuration

**Purpose:** Plug-and-play telephony providers per college. Each college can have its own provider configuration.

**Supported Providers (pluggable architecture):**
- Plivo
- Twilio
- Exotel
- Ozonetel
- (Future: Vonage, Bandwidth)

**Per-Provider Configuration (Admin sets up):**
- Auth credentials (Auth ID / Token, API Key)
- Caller ID(s) - list of numbers to use for outbound calls
- Inbound webhook URL (auto-generated by platform)
- SIP configuration (optional)
- Test connection button before saving

**Telephony Settings:**
- Default Caller ID per campaign
- Caller ID rotation strategy (round-robin, random, fixed)
- Call recording toggle (per college, per campaign)
- Recording storage location (platform S3 or college's own bucket)
- Max concurrent calls per campaign
- Retry rules: retry on no-answer after N minutes, max M retries

**SuperAdmin View:**
- All provider configurations across colleges
- Can add platform-level provider (shared pool) that colleges can opt into
- Monitor provider health and call success rates

---

### 4.5 Campaigns

**Campaign Lifecycle:**
```
Draft → Scheduled → Running → Paused → Completed → Archived
```

**4.5.1 Campaign Builder**

Campaign Details:
- Campaign Name, Description
- College (auto-set for Admin, selectable for SuperAdmin)
- Campaign Type: Admissions Outreach / Follow-Up / Re-Engagement / Survey
- Start Date / End Date
- Operating Hours (e.g., 9 AM – 6 PM, Mon–Sat)
- Time Zone

Contact List:
- Select from existing contacts (filter by status, tag, company)
- Upload a new CSV (contacts get imported and linked to this campaign)
- Exclude contacts with DNC flag (enforced automatically)
- Estimated reach count shown before launch

Telephony:
- Select configured provider
- Select caller ID or rotation strategy
- Enable/disable call recording

Call Script:
- Rich text call script editor (guidance for agents)
- Variable placeholders: {{contact_name}}, {{course_interest}}, {{college_name}}
- Script versioning (so changes mid-campaign are tracked)

Disposition Form Builder:
- Admin designs the post-call form fields for this campaign
- Default fields included (see 4.6), admin can add custom fields
- Field types: dropdown, text, date, yes/no, multi-select

**4.5.2 Campaign Execution (Dialer Interface)**

Agent Call View:
- One contact shown at a time
- Contact details panel (name, phone, course interest, prior notes, call history)
- Script panel (collapsible)
- Click-to-Call button (triggers outbound call via provider)
- Live call timer
- On active call: mute, hold, transfer options
- Post-call disposition form appears immediately after call ends
- Next contact loads automatically after disposition is saved

Call Queue Management:
- Contacts are distributed across agents automatically (round-robin or admin-assigned)
- If agent skips, contact goes back to queue
- System auto-dials (predictive mode) or agent-initiated (preview mode) - configurable per campaign

**Predictive / Progressive Dialer (Advanced):**
- System dials multiple contacts simultaneously, connects agent only when answered
- Abandon rate monitoring (must stay below regulatory threshold)
- Configurable dial ratio

---

### 4.6 Post-Call Disposition (Call Outcome Capture)

This is captured immediately after every call by the agent.

**Standard Disposition Fields:**

| Field | Type | Options |
|---|---|---|
| Call Status | Dropdown | Answered, No Answer, Busy, Switched Off, Invalid Number, Call Back Later |
| Interest Level | Dropdown (if Answered) | Interested, Not Interested, Need More Info, Call Back |
| Course Interested In | Multi-select | (college's configured courses) |
| Quota / Seat Type | Dropdown | Management Quota, NRI Quota, Merit, Lateral Entry |
| Willing to Visit Campus | Yes / No | - |
| Preferred Visit Date | Date Picker (if Yes) | - |
| Preferred Visit Time | Time Picker | - |
| Callback Scheduled | Yes / No | - |
| Callback Date & Time | DateTime Picker (if Yes) | - |
| Special Notes | Text Area | - |
| Do Not Call (DNC) | Toggle | - |

**Outcome-Based Routing:**
- Answered + Interested → moved to "Interested" pipeline, follow-up task auto-created
- Answered + Callback → callback scheduled, appears in follow-up queue
- No Answer (auto-detected) → retry rule applied
- DNC flagged → contact removed from all future campaigns

---

### 4.7 Follow-Up Management

**Follow-Up Queue:**
- All contacts where disposition = "Callback Scheduled" or "Interested - not yet visited"
- Sorted by: overdue first, then by scheduled date/time
- Filter by: agent, campaign, status, date range

**Follow-Up Card:**
- Contact name, phone, course interest
- Original call date & outcome summary
- Scheduled callback date/time
- Countdown / overdue badge
- Quick-call button (links back to dialer)
- Notes from all previous interactions

**Re-Engagement Campaigns:**
- Admin can create a new campaign specifically targeting "Interested" contacts who haven't responded to follow-ups after N days
- System auto-populates contact list from pipeline

**Visit Management:**
- Contacts who agreed to visit → "Visit Scheduled" status
- Admin can view a calendar of upcoming campus visits
- Confirmation SMS/email triggered automatically (via telephony provider or email service)
- Post-visit status update: Visited, No-Show, Enrolled

---

### 4.8 Analytics & Reports

**Call Analytics (per campaign / college / platform):**
- Total calls made / answered / not answered
- Answer rate (%)
- Average call duration
- Calls per agent per day
- Hourly call volume chart
- Retry analysis (contacts that needed 2, 3, 4+ attempts)

**Funnel Analytics:**
```
Total Contacts in Campaign
  → Called (at least once)
    → Answered
      → Interested
        → Visit Scheduled
          → Visited
            → Enrolled
```
- Conversion rate at each stage
- Drop-off analysis per stage

**Agent Performance:**
- Calls made, answered, duration per agent
- Disposition breakdown per agent
- Interest conversion rate per agent
- Activity timeline (call log by hour)

**Course Interest Heatmap:**
- Which courses get the most interest
- Which quota types are most in demand

**Geo Analysis (if city/state captured):**
- Lead source geography map

**Report Export:**
- All reports exportable as CSV or PDF
- Scheduled reports (email delivery on daily/weekly/monthly cadence)

---

### 4.9 Data Import / Export

**Import:**
- CSV import for contacts (bulk)
- Field mapping UI: drag CSV column → platform field
- Validation before import: duplicate phone detection, required field check
- Import history log (who imported, when, how many records, errors)
- Support for Excel (.xlsx) files

**Export:**
- Export contacts with all fields + call history summary
- Export campaign results (all dispositions)
- Export filtered views (e.g., "all Interested contacts from Campaign X")
- Formats: CSV, Excel
- Export audit log

---

### 4.10 Settings

**College-Level Settings (Admin):**
- College profile (name, logo, address)
- Courses list (the courses offered - used in disposition forms)
- Operating hours
- Agent management (create, edit, deactivate agents)
- Notification preferences (email alerts for follow-up overdue, campaign completion)
- Data retention policy

**Platform Settings (SuperAdmin):**
- Global email/SMS templates
- Audit log retention
- Plan/tier definitions
- Billing overview per college
- Feature flags per college

---

### 4.11 Audit Logs

- Every create, update, delete action is logged
- Who (user), What (resource + action), When (timestamp), Where (IP)
- SuperAdmin can view logs across all colleges
- Admin can view logs for their college only
- Filterable by user, action type, date range
- Non-deletable (append-only)

---

## 5. Complete User Journey

```
SuperAdmin
  → Creates college + admin credentials
  → College admin logs in
  → Admin configures telephony provider (Plivo / Twilio)
  → Admin imports or manually adds contacts
  → Admin organizes contacts under companies
  → Admin creates a campaign (selects contacts, sets schedule, builds disposition form)
  → Admin assigns agents or lets system auto-distribute
  → Campaign goes live at scheduled time
  
Agent (or Admin)
  → Opens dialer interface
  → Sees contact info + script
  → Clicks "Call" → outbound call placed via configured provider
  → After call ends → disposition form auto-appears
  → Agent fills outcome (answered/not, interested, quota, visit willing, callback time)
  → Contact moves to appropriate pipeline stage
  → Next contact auto-loads
  
System (Automated)
  → No-answer contacts queued for retry per retry rule
  → Callback-scheduled contacts appear in follow-up queue at the right time
  → Interested contacts tracked in funnel
  → Visit confirmations sent via SMS/email
  → Overdue follow-up alerts sent to agent/admin

Admin
  → Monitors live campaign dashboard (calls in progress, queue depth)
  → Reviews analytics after campaign
  → Exports results
  → Creates follow-up campaign for non-responders
  → Manages re-engagement for visited-but-not-enrolled contacts

SuperAdmin
  → Reviews cross-college analytics
  → Monitors platform health
  → Generates billing / usage reports
```

---

## 6. Technical Architecture

### 6.1 Frontend (This Repo)
- **Framework:** React 19 + Vite + Tailwind CSS v4
- **Routing:** React Router v7 (file-based or config-based)
- **State Management:** Zustand (lightweight, per-slice stores)
- **Data Fetching:** TanStack Query (React Query) - caching, background refresh, optimistic updates
- **Forms:** React Hook Form + Zod validation
- **UI Components:** shadcn/ui (Radix UI primitives) + custom components
- **Tables:** TanStack Table (for contacts, campaigns, analytics)
- **Charts:** Recharts or Victory
- **Dialer UI:** Custom WebRTC or provider SDK integration
- **Real-time:** WebSocket or Server-Sent Events (for live campaign updates)
- **Date/Time:** date-fns + react-day-picker

### 6.2 Backend (Separate Repo / Service)
- **Runtime:** Node.js + Express (or Fastify for performance)
- **Language:** TypeScript
- **ORM:** Prisma (PostgreSQL)
- **Auth:** JWT (access + refresh), bcrypt for password hashing
- **Multi-tenancy:** Row-level isolation with `college_id` on every table
- **Queue:** BullMQ + Redis - for campaign call scheduling and retries
- **File Storage:** AWS S3 (recordings, imports/exports)
- **Email:** SendGrid or Resend
- **SMS:** Via telephony provider webhooks

### 6.3 Database (PostgreSQL Schema Domains)
```
auth          → users, roles, sessions, refresh_tokens
tenants       → colleges, college_settings
contacts      → companies, contacts, contact_tags
telephony     → provider_configs, caller_ids
campaigns     → campaigns, campaign_contacts, call_scripts, disposition_forms
calls         → call_logs, dispositions, recordings
follow_ups    → follow_up_tasks, visit_schedules
analytics     → pre-aggregated metrics tables
audit         → audit_logs
```

### 6.4 Telephony Integration Layer
- Provider-agnostic adapter pattern
- Each provider (Plivo, Twilio) implements a standard interface:
  - `initiateCall(from, to, callbackUrl)`
  - `hangupCall(callId)`
  - `getCallStatus(callId)`
  - `handleWebhook(payload)` → normalizes to internal call event format
- Webhook endpoints registered per college per provider
- Call events flow: `initiated → ringing → answered → ended → recorded`

### 6.5 Infrastructure
- **Hosting:** AWS (EC2 / ECS) or Render / Railway for MVP
- **CDN:** CloudFront for frontend assets
- **Database:** AWS RDS PostgreSQL (managed)
- **Cache / Queue:** AWS ElastiCache (Redis)
- **Storage:** AWS S3
- **Monitoring:** Sentry (error tracking), Datadog or Grafana (metrics)
- **CI/CD:** GitHub Actions → staging → production pipeline
- **Environments:** development, staging, production

---

## 7. Folder Structure (Frontend)

```
src/
├── assets/
│   └── brand/                  # logos, icons
├── components/
│   ├── ui/                     # base UI: Button, Input, Modal, Table, Badge
│   ├── layout/                 # Sidebar, Header, PageWrapper
│   ├── auth/                   # LoginForm, ProtectedRoute
│   ├── contacts/               # ContactCard, CompanyRow, ContactFilters
│   ├── campaigns/              # CampaignCard, CampaignBuilder, DispositionForm
│   ├── dialer/                 # DialerPanel, CallControls, ScriptPanel
│   ├── analytics/              # FunnelChart, AgentTable, CallVolumeChart
│   └── common/                 # EmptyState, LoadingSkeleton, ErrorBoundary
├── pages/
│   ├── auth/                   # Login, ForgotPassword
│   ├── dashboard/              # SuperAdminDashboard, AdminDashboard
│   ├── tenants/                # CollegeList, CollegeDetail (SuperAdmin)
│   ├── contacts/               # ContactList, ContactDetail, CompanyList
│   ├── telephony/              # TelephonySettings, ProviderForm
│   ├── campaigns/              # CampaignList, CampaignBuilder, CampaignDetail
│   ├── dialer/                 # DialerPage (full-screen call execution)
│   ├── followups/              # FollowUpQueue, VisitCalendar
│   ├── analytics/              # AnalyticsDashboard, ReportsList
│   ├── settings/               # CollegeSettings, AgentManagement
│   └── audit/                  # AuditLogPage
├── store/
│   ├── authStore.js
│   ├── contactsStore.js
│   ├── campaignStore.js
│   └── dialerStore.js
├── hooks/
│   ├── useAuth.js
│   ├── useCampaign.js
│   ├── useContacts.js
│   └── useTelephony.js
├── services/
│   ├── api.js                  # axios instance with interceptors
│   ├── auth.service.js
│   ├── contacts.service.js
│   ├── campaigns.service.js
│   └── telephony.service.js
├── utils/
│   ├── formatters.js           # date, phone, duration formatters
│   ├── validators.js
│   └── constants.js
├── router/
│   └── index.jsx               # route definitions + guards
├── App.jsx
└── main.jsx
```

---

## 8. Key Screens List

| Screen | Role | Description |
|---|---|---|
| Login | All | Single login page, role-aware redirect |
| SuperAdmin Dashboard | SA | Platform overview |
| College List | SA | Manage all colleges |
| College Detail | SA | Edit, view usage, impersonate |
| Admin Dashboard | Admin | Campaign + funnel overview |
| Contact List | Both | Contacts table with filters |
| Contact Detail | Both | Full contact profile + history |
| Company List | Both | Companies with contact counts |
| Import Contacts | Admin | CSV upload + field mapping |
| Telephony Settings | Admin/SA | Provider config management |
| Campaign List | Both | All campaigns with status |
| Campaign Builder | Admin | Multi-step campaign creation |
| Campaign Detail | Both | Live stats + contact list |
| Dialer | Agent/Admin | Full-screen call execution UI |
| Post-Call Form | Agent | Disposition capture after call |
| Follow-Up Queue | Agent/Admin | Pending callbacks and follow-ups |
| Visit Calendar | Admin | Campus visit scheduling view |
| Analytics Dashboard | Both | Funnel, agent, call analytics |
| Report Export | Both | Filter + download reports |
| Agent Management | Admin | Add/edit/deactivate agents |
| College Settings | Admin | Profile, courses, hours |
| Audit Logs | Both | Activity audit trail |

---

## 9. Development Phases

### Phase 1 - Foundation (Weeks 1–3)
- Project setup: routing, auth, layout, base components
- Login + role-based access
- Tenant management (SuperAdmin CRUD for colleges)
- Basic contacts + companies CRUD
- Basic dashboard shells

### Phase 2 - Core Operations (Weeks 4–7)
- Telephony provider configuration
- Campaign builder (full multi-step flow)
- Contact import (CSV + field mapping)
- Dialer interface (click-to-call with Plivo/Twilio)
- Post-call disposition form

### Phase 3 - Intelligence Layer (Weeks 8–10)
- Retry engine (automated re-queue on no-answer)
- Follow-up queue
- Visit scheduling + confirmation notifications
- Campaign re-engagement flow

### Phase 4 - Analytics & Polish (Weeks 11–13)
- Analytics dashboards (funnel, agent, call volume)
- Report export (CSV, PDF)
- Audit logs
- SuperAdmin cross-college analytics

### Phase 5 - Production Hardening (Weeks 14–15)
- End-to-end testing
- Performance optimization
- Security audit (OWASP top 10)
- Documentation
- Staging deployment + UAT
- Production deployment

---

## 10. Open Questions / Decisions Needed

1. **Dialer mode:** Preview (agent-initiated) only in Phase 2, or include predictive dialer from the start?
2. **Call recording:** Store on platform S3 or give colleges option to bring their own bucket?
3. **Enrollment confirmation:** Should the platform capture actual enrollment or just "visit occurred"?
4. **WhatsApp/SMS follow-up:** Should follow-ups include automated WhatsApp messages (via provider) in addition to calls?
5. **Multi-language support:** English only for now, or plan for regional language call scripts?
6. **Mobile app:** Is a mobile-responsive web app sufficient, or do agents need a native iOS/Android app?
7. **Billing model:** Per college flat fee, per call, or per user seat?
8. **TRAI compliance:** For India - DND scrubbing, call time restrictions, and reporting requirements need to be built in.
