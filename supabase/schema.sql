-- Chamthi365 — schema Supabase (chạy trong SQL Editor của project)
-- Giống app gốc: cp_bai + cp_phieu, soft-delete qua cột xoa, RLS theo uid.

create table if not exists cp_bai (
  id        text primary key,
  uid       uuid not null references auth.users(id) on delete cascade,
  data      jsonb,
  xoa       boolean not null default false,
  cap_nhat  timestamptz not null default now()
);

create table if not exists cp_phieu (
  id        text primary key,
  bai_id    text,
  uid       uuid not null references auth.users(id) on delete cascade,
  data      jsonb,
  xoa       boolean not null default false,
  cap_nhat  timestamptz not null default now()
);

create index if not exists cp_bai_cap_nhat on cp_bai (uid, cap_nhat);
create index if not exists cp_phieu_cap_nhat on cp_phieu (uid, cap_nhat);
create index if not exists cp_phieu_bai on cp_phieu (bai_id);

alter table cp_bai enable row level security;
alter table cp_phieu enable row level security;

drop policy if exists "chi chu so huu" on cp_bai;
create policy "chi chu so huu" on cp_bai
  for all using (auth.uid() = uid) with check (auth.uid() = uid);

drop policy if exists "chi chu so huu" on cp_phieu;
create policy "chi chu so huu" on cp_phieu
  for all using (auth.uid() = uid) with check (auth.uid() = uid);
