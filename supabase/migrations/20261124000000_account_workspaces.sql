begin;

create table public.account_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  payload jsonb not null,
  constraint account_workspaces_payload_v1 check ((
    jsonb_typeof(payload) = 'object'
    and payload -> 'version' = '1'::jsonb
    and jsonb_typeof(payload -> 'routines') = 'array'
    and jsonb_typeof(payload -> 'occurrences') = 'array'
    and jsonb_typeof(payload -> 'logs') = 'array'
    and jsonb_typeof(payload -> 'projects') = 'array'
    and jsonb_typeof(payload -> 'milestones') = 'array'
    and not (payload ? 'settings')
  ) is true)
);

alter table public.account_workspaces enable row level security;

revoke all on public.account_workspaces from public, anon, authenticated;
grant select on public.account_workspaces to authenticated;

create policy "Permanent users can read their own workspace"
  on public.account_workspaces
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') = 'false'
  );

-- Revision 0 means first upload. A null result means the caller must fetch
-- the current revision before resolving the conflict and retrying.
create function public.save_account_workspace(expected_revision bigint, workspace jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  saved_revision bigint;
begin
  if account_id is null or (auth.jwt() ->> 'is_anonymous') is distinct from 'false' then
    raise exception 'A permanent account is required' using errcode = '42501';
  end if;

  if expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid workspace revision' using errcode = '22023';
  end if;

  if expected_revision = 0 then
    insert into public.account_workspaces (user_id, payload)
    values (account_id, workspace)
    on conflict (user_id) do nothing
    returning revision into saved_revision;
  else
    update public.account_workspaces
    set payload = workspace,
        revision = revision + 1,
        updated_at = statement_timestamp()
    where user_id = account_id and revision = expected_revision
    returning revision into saved_revision;
  end if;

  return saved_revision;
end;
$$;

revoke all on function public.save_account_workspace(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_account_workspace(bigint, jsonb) to authenticated;

commit;
