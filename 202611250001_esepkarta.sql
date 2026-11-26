create extension if not exists pgcrypto;

create table if not exists public.topics (
  id text primary key, official_code text, grade smallint not null check (grade between 7 and 9),
  subject text not null check (subject in ('algebra','geometry','stats')),
  section text not null, title_ru text not null, title_kk text not null,
  objective_ru text not null, keywords text[] not null default '{}',
  prerequisites text[] not null default '{}', verify boolean not null default true
);
create table if not exists public.tasks (
  id text primary key, topic_id text not null references public.topics(id),
  level text not null check (level in ('basic','medium','advanced')),
  context text not null check (context in ('city','village','universal')),
  question jsonb not null, answer jsonb not null, hint jsonb not null,
  solution jsonb not null, common_mistake jsonb not null,
  lang text not null check (lang in ('ru','kz')),
  source text not null check (source in ('manual','ai')),
  verified boolean not null default false
);
create table if not exists public.ai_packs (
  id uuid primary key default gen_random_uuid(), topic_id text not null references public.topics(id),
  lang text not null check (lang in ('ru','kz')), content_json jsonb not null,
  validated boolean not null default false, usage_count integer not null default 0,
  unique(topic_id, lang)
);
create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, created_at timestamptz not null default now()
);
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers(id) on delete cascade,
  name text not null, invite_code text not null unique default encode(gen_random_bytes(6),'hex'), created_at timestamptz not null default now()
);
create table if not exists public.class_topics (
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id text not null references public.topics(id), primary key(class_id, topic_id)
);
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(), anon_id uuid not null,
  topic_id text not null references public.topics(id), test_type text not null check (test_type in ('pre','post')),
  score smallint not null check (score between 0 and 100), region_type text not null check(region_type in ('city','village')),
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), task_id text not null, message text not null,
  status text not null default 'new' check(status in ('new','reviewing','resolved')), created_at timestamptz not null default now()
);

alter table public.topics enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_packs enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.class_topics enable row level security;
alter table public.results enable row level security;
alter table public.reports enable row level security;

create policy "published topics readable" on public.topics for select to anon, authenticated using (true);
create policy "verified tasks readable" on public.tasks for select to anon, authenticated using (verified = true);
create policy "validated packs readable" on public.ai_packs for select to anon, authenticated using (validated = true);
create policy "teacher reads own profile" on public.teachers for select to authenticated using (id = auth.uid());
create policy "teacher inserts own profile" on public.teachers for insert to authenticated with check (id = auth.uid());
create policy "teacher manages own classes" on public.classes for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teacher manages topics in own classes" on public.class_topics for all to authenticated using (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())) with check (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
create policy "anonymous learner writes own result" on public.results for insert to authenticated with check (anon_id = auth.uid());
create policy "learner reads own result" on public.results for select to authenticated using (anon_id = auth.uid());
create policy "reports may be submitted" on public.reports for insert to anon, authenticated with check (length(message) between 1 and 2000);
create policy "teachers read reports for own class tasks" on public.reports for select to authenticated using (exists(select 1 from public.classes c join public.class_topics ct on ct.class_id = c.id join public.tasks t on t.topic_id = ct.topic_id where c.teacher_id = auth.uid() and t.id = reports.task_id));

grant select on public.topics, public.tasks, public.ai_packs to anon, authenticated;
grant insert on public.results to authenticated;
grant select on public.results to authenticated;
grant insert on public.reports to anon, authenticated;
grant select, insert, update, delete on public.teachers, public.classes, public.class_topics to authenticated;
