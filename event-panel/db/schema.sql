-- Event Panel schema for Supabase (Postgres)
-- Apply in Supabase SQL Editor.

-- Extensions
create extension if not exists "pgcrypto";

-- EVENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date text not null,
  location text,
  guests int,
  created_at timestamptz not null default now()
);
create index if not exists events_owner_id_idx on public.events(owner_id);

-- BUDGET ITEMS
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  unit text,
  qty numeric not null default 0,
  price numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists budget_items_event_id_idx on public.budget_items(event_id);
create index if not exists budget_items_owner_id_idx on public.budget_items(owner_id);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  budget_item_id uuid not null references public.budget_items(id) on delete cascade,
  amount numeric not null,
  due_date text,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);
create index if not exists payments_event_id_idx on public.payments(event_id);
create index if not exists payments_owner_id_idx on public.payments(owner_id);

-- MENU ITEMS (guest + staff)
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  menu_type text not null check (menu_type in ('guest','staff')),
  position text not null,
  unit text,
  qty numeric not null default 0,
  price numeric not null default 0,
  total_amount numeric not null default 0,
  weight_g numeric not null default 0,
  total_weight_g numeric not null default 0,
  note text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists menu_items_event_id_idx on public.menu_items(event_id);
create index if not exists menu_items_owner_id_idx on public.menu_items(owner_id);

-- RIDERS
create table if not exists public.rider_docs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  raw_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists rider_docs_event_id_idx on public.rider_docs(event_id);

create table if not exists public.rider_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  rider_doc_id uuid not null references public.rider_docs(id) on delete cascade,
  section text not null,
  text text not null,
  severity text not null default 'normal' check (severity in ('normal','critical')),
  provider text not null default 'vendor' check (provider in ('venue','vendor','artist','us')),
  due_date text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
create index if not exists rider_items_event_id_idx on public.rider_items(event_id);

-- TASKS (timing + checklists)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_at text,
  status text not null default 'todo' check (status in ('todo','doing','done','overdue')),
  assignee_name text,
  assignee_phone text,
  created_at timestamptz not null default now()
);
create index if not exists tasks_event_id_idx on public.tasks(event_id);

-- RLS
alter table public.events enable row level security;
alter table public.budget_items enable row level security;
alter table public.payments enable row level security;
alter table public.menu_items enable row level security;
alter table public.rider_docs enable row level security;
alter table public.rider_items enable row level security;
alter table public.tasks enable row level security;

-- Owner-only policies
do $$
begin
  -- EVENTS
  create policy "events_select_own" on public.events for select using (owner_id = auth.uid());
  create policy "events_insert_own" on public.events for insert with check (owner_id = auth.uid());
  create policy "events_update_own" on public.events for update using (owner_id = auth.uid());
  create policy "events_delete_own" on public.events for delete using (owner_id = auth.uid());

  -- BUDGET
  create policy "budget_select_own" on public.budget_items for select using (owner_id = auth.uid());
  create policy "budget_insert_own" on public.budget_items for insert with check (owner_id = auth.uid());
  create policy "budget_update_own" on public.budget_items for update using (owner_id = auth.uid());
  create policy "budget_delete_own" on public.budget_items for delete using (owner_id = auth.uid());

  -- PAYMENTS
  create policy "payments_select_own" on public.payments for select using (owner_id = auth.uid());
  create policy "payments_insert_own" on public.payments for insert with check (owner_id = auth.uid());
  create policy "payments_update_own" on public.payments for update using (owner_id = auth.uid());
  create policy "payments_delete_own" on public.payments for delete using (owner_id = auth.uid());

  -- MENU
  create policy "menu_select_own" on public.menu_items for select using (owner_id = auth.uid());
  create policy "menu_insert_own" on public.menu_items for insert with check (owner_id = auth.uid());
  create policy "menu_update_own" on public.menu_items for update using (owner_id = auth.uid());
  create policy "menu_delete_own" on public.menu_items for delete using (owner_id = auth.uid());

  -- RIDERS
  create policy "rider_docs_select_own" on public.rider_docs for select using (owner_id = auth.uid());
  create policy "rider_docs_insert_own" on public.rider_docs for insert with check (owner_id = auth.uid());
  create policy "rider_docs_update_own" on public.rider_docs for update using (owner_id = auth.uid());
  create policy "rider_docs_delete_own" on public.rider_docs for delete using (owner_id = auth.uid());

  create policy "rider_items_select_own" on public.rider_items for select using (owner_id = auth.uid());
  create policy "rider_items_insert_own" on public.rider_items for insert with check (owner_id = auth.uid());
  create policy "rider_items_update_own" on public.rider_items for update using (owner_id = auth.uid());
  create policy "rider_items_delete_own" on public.rider_items for delete using (owner_id = auth.uid());

  -- TASKS
  create policy "tasks_select_own" on public.tasks for select using (owner_id = auth.uid());
  create policy "tasks_insert_own" on public.tasks for insert with check (owner_id = auth.uid());
  create policy "tasks_update_own" on public.tasks for update using (owner_id = auth.uid());
  create policy "tasks_delete_own" on public.tasks for delete using (owner_id = auth.uid());
exception
  when duplicate_object then
    -- policies already exist
    null;
end
$$;
