-- はんぶんこ 初期スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください。
-- アクセスはすべてサーバー側（service_role キー）から行うため、RLS を有効にしてポリシーは作りません。
-- （anon キーからは一切読み書きできない状態になります）

create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount integer not null check (amount > 0),
  category text not null,
  paid_by smallint not null check (paid_by in (1, 2)),
  split_type text not null default 'equal' check (split_type in ('equal', 'ratio', 'amount')),
  split_value numeric,
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null,
  title text not null,
  amount integer not null check (amount > 0),
  category text not null,
  paid_by smallint not null check (paid_by in (1, 2)),
  split_type text not null default 'equal' check (split_type in ('equal', 'ratio', 'amount')),
  split_value numeric,
  memo text,
  receipt_path text,
  recurring_id uuid references recurring_expenses (id) on delete set null,
  created_by smallint check (created_by in (1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on expenses (spent_on);

-- 固定費を「その月に登録済みか」の記録。支出を消しても再登録されないよう別テーブルにする
create table if not exists recurring_generations (
  recurring_id uuid not null references recurring_expenses (id) on delete cascade,
  month char(7) not null,
  primary key (recurring_id, month)
);

create table if not exists settlements (
  month char(7) primary key,
  from_member smallint check (from_member in (1, 2)),
  to_member smallint check (to_member in (1, 2)),
  amount integer not null,
  exact_amount numeric not null,
  settled_at timestamptz not null default now(),
  settled_by smallint check (settled_by in (1, 2))
);

-- ログイン試行の制限（PIN の総当たり対策）
create table if not exists auth_throttle (
  id smallint primary key default 1 check (id = 1),
  failures integer not null default 0,
  locked_until timestamptz
);
insert into auth_throttle (id) values (1) on conflict do nothing;

alter table recurring_expenses enable row level security;
alter table expenses enable row level security;
alter table recurring_generations enable row level security;
alter table settlements enable row level security;
alter table auth_throttle enable row level security;

-- レシート画像（非公開バケット）
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;
