begin;

alter table public.workers
  alter column visit_charge_pkr drop not null,
  add column skills text[] not null default '{}'
    check (cardinality(skills) <= 10 and array_position(skills, null) is null),
  add column profile_version integer not null default 1 check (profile_version > 0);

alter table public.service_requests
  add column preferred_date date,
  add column budget_pkr integer check (budget_pkr between 1 and 1000000),
  add constraint one_preferred_date_format check (preferred_time is null or preferred_date is null);

create index service_requests_by_customer on public.service_requests (customer_id, created_at desc);

commit;
