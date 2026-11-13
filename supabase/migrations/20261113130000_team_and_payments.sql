-- Team, attendance, payroll and payments in the internal dashboard
-- (app/internal/(dashboard)/me, people, payroll and payments).
--
--   team_people          employees and interns: employee ID, name, photo,
--                        designation, joining date, who logs an intern's
--                        days, and the salary lines a payslip starts from.
--                        Being on this list is what lets someone with no
--                        other role into the dashboard (My day only).
--   team_attendance      one row per person per day: start and end time,
--                        active hours, a half day or a leave (paid, sick or
--                        unpaid). Employees log their own; an intern's
--                        reviewer or an admin logs an intern's.
--   team_reimbursements  expenses employees claim, from the dashboard or by
--                        email. Approved ones go on that month's payslip.
--   team_payslips        one per person per month. "Done" emails it as a PDF
--                        (made on the fly; no bank details anywhere).
--   payees               writers, hackathon partners and sponsors, each with
--                        a short code they put in their invoice email subject.
--   payments             what Studio1 owes them, or a sponsor owes Studio1,
--                        from invoice emails or added by hand.
--   team-files           private bucket: profile photos, invoices, receipts.
--
-- The site's server key is the only one with access. Run after
-- 20261113120000_blog_threads_and_schedule.sql. Safe to run again.

-- People -----------------------------------------------------------------

create table if not exists public.team_people (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,

  name text not null default '',
  employee_code text,
  photo_path text,
  kind text not null default 'employee' check (kind in ('employee', 'intern')),
  designation text not null default '',
  joined_on date,
  -- Interns: who logs their days (besides admins).
  reviewer text check (reviewer is null or reviewer = lower(reviewer)),
  active boolean not null default true,

  -- What a new payslip starts from: [{"label": "Basic", "amount": 25000}, …]
  earnings jsonb not null default '[]',
  deductions jsonb not null default '[]'
);

create unique index if not exists team_people_employee_code
  on public.team_people (lower(employee_code))
  where employee_code is not null and employee_code <> '';
create index if not exists team_people_by_reviewer
  on public.team_people (reviewer) where reviewer is not null;

alter table public.team_people enable row level security;
grant select, insert, update, delete on public.team_people to service_role;
revoke all on public.team_people from anon, authenticated;

-- Attendance -------------------------------------------------------------

create table if not exists public.team_attendance (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.team_people (email) on update cascade on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  logged_by text not null,

  kind text not null default 'work' check (kind in ('work', 'half_day', 'leave')),
  -- For a leave, or the other half of a half day.
  leave_type text check (leave_type in ('paid', 'sick', 'unpaid')),
  start_time time,
  end_time time,
  active_minutes integer check (active_minutes between 0 and 1440),
  note text not null default '',

  unique (email, day)
);

create index if not exists team_attendance_by_day
  on public.team_attendance (day);

alter table public.team_attendance enable row level security;
grant select, insert, update, delete on public.team_attendance to service_role;
revoke all on public.team_attendance from anon, authenticated;

-- Reimbursements ---------------------------------------------------------

create table if not exists public.team_reimbursements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null references public.team_people (email) on update cascade on delete cascade,

  spent_on date,
  description text not null default '',
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text not null default 'INR',
  receipt_path text,
  receipt_name text,
  source text not null default 'dashboard' check (source in ('dashboard', 'email')),
  -- Resend's id for the email it came in, so a retried webhook can't add it twice.
  inbound_id text unique,

  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'paid')),
  -- The payslip month it's paid with (first of the month).
  month date,
  decided_by text,
  decided_at timestamptz,
  note text not null default ''
);

create index if not exists team_reimbursements_by_status
  on public.team_reimbursements (status, created_at desc);
create index if not exists team_reimbursements_by_person
  on public.team_reimbursements (email, created_at desc);

alter table public.team_reimbursements enable row level security;
grant select, insert, update, delete on public.team_reimbursements to service_role;
revoke all on public.team_reimbursements from anon, authenticated;

-- Payslips ---------------------------------------------------------------

create table if not exists public.team_payslips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  email text not null references public.team_people (email) on update cascade on delete cascade,
  month date not null check (extract(day from month) = 1),

  -- Copied from team_people when the slip is made, so old slips don't change.
  name text not null default '',
  employee_code text,
  designation text not null default '',
  joined_on date,

  paid_days numeric(5, 1),
  lop_days numeric(5, 1) not null default 0,
  earnings jsonb not null default '[]',
  deductions jsonb not null default '[]',
  reimbursement numeric(12, 2) not null default 0,
  net numeric(12, 2) not null default 0,

  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  sent_by text,
  resend_id text,

  unique (email, month)
);

create index if not exists team_payslips_by_month
  on public.team_payslips (month);

alter table public.team_payslips enable row level security;
grant select, insert, update, delete on public.team_payslips to service_role;
revoke all on public.team_payslips from anon, authenticated;

-- Payees and payments ----------------------------------------------------

create table if not exists public.payees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,15}$'),
  name text not null,
  email text check (email is null or email = lower(email)),
  kind text not null default 'writer' check (kind in ('writer', 'hackathon', 'sponsor', 'other')),
  notes text not null default '',
  active boolean not null default true
);

create unique index if not exists payees_code on public.payees (lower(code));
create index if not exists payees_by_email on public.payees (email) where email is not null;

alter table public.payees enable row level security;
grant select, insert, update, delete on public.payees to service_role;
revoke all on public.payees from anon, authenticated;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A staff email, or "email" for invoices that came in by mail.
  created_by text not null,

  payee_id uuid references public.payees (id) on delete set null,
  name text not null default '',
  email text,
  code text,
  kind text not null default 'writer' check (kind in ('writer', 'hackathon', 'sponsor', 'other')),
  -- out: Studio1 pays them. in: they pay Studio1 (sponsors).
  direction text not null default 'out' check (direction in ('out', 'in')),
  month date not null,
  description text not null default '',
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text not null default 'INR',

  status text not null default 'due' check (status in ('due', 'paid', 'cancelled')),
  source text not null default 'dashboard' check (source in ('dashboard', 'email')),
  inbound_id text unique,
  email_subject text,
  -- Why an emailed invoice needs a look (unknown sender, no amount, …).
  flagged text,
  invoice_path text,
  invoice_name text,

  paid_on date,
  paid_by text,
  paid_reference text,
  paid_email_id text,
  note text not null default ''
);

create index if not exists payments_by_status
  on public.payments (status, month desc);

alter table public.payments enable row level security;
grant select, insert, update, delete on public.payments to service_role;
revoke all on public.payments from anon, authenticated;

-- Files: photos (WebP), invoices and receipts (PDF or images), 10 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-files', 'team-files', false, 10485760,
  array['image/webp', 'image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do nothing;
