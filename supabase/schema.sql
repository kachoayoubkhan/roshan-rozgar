begin;

create type public.trade as enum ('plumber', 'electrician', 'ac-technician', 'carpenter');
create type public.service_area as enum ('G-11', 'G-10', 'F-10');
create type public.urgency as enum ('today', 'soon', 'flexible');
create type public.request_status as enum ('open', 'quoted', 'price_agreed', 'booked', 'declined', 'cancelled');
create type public.quote_status as enum ('proposed', 'accepted', 'rejected');
create type public.booking_status as enum ('confirmed', 'in_progress', 'completed', 'cancelled');
create type public.message_sender as enum ('worker', 'customer');

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  trade public.trade not null,
  experience_years integer not null check (experience_years between 0 and 80),
  service_area public.service_area not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  online_preference boolean not null default false,
  visit_charge_pkr integer not null check (visit_charge_pkr between 1 and 1000000),
  onboarding_method text not null check (onboarding_method in ('seed', 'voice', 'assisted')),
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  service_area public.service_area not null
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  trade public.trade not null,
  issue_description text not null check (length(btrim(issue_description)) between 1 and 1500),
  service_area public.service_area not null,
  urgency public.urgency not null,
  preferred_time timestamptz,
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (id, customer_id)
);

-- The request identifies its customer; worker_id scopes the conversation to one worker.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id),
  worker_id uuid not null references public.workers(id),
  sender_role public.message_sender not null,
  message_text text check (length(btrim(message_text)) between 1 and 4000),
  audio_path text check (length(btrim(audio_path)) between 1 and 512),
  created_at timestamptz not null default now(),
  check (message_text is not null or audio_path is not null)
);
create index messages_by_conversation on public.messages (request_id, worker_id, created_at);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id),
  worker_id uuid not null references public.workers(id),
  amount_pkr integer not null check (amount_pkr between 1 and 1000000),
  status public.quote_status not null default 'proposed',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'accepted') = (accepted_at is not null)),
  unique (id, request_id, worker_id, amount_pkr, status)
);
create unique index one_accepted_quote_per_request on public.quotes (request_id)
  where status = 'accepted';

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  worker_id uuid not null,
  customer_id uuid not null,
  accepted_quote_id uuid not null,
  agreed_amount_pkr integer not null,
  quote_status public.quote_status generated always as ('accepted'::public.quote_status) stored,
  scheduled_time timestamptz not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  foreign key (request_id, customer_id) references public.service_requests (id, customer_id),
  -- Prevents both mismatched quotes and mutation of an accepted quote backing a booking.
  foreign key (accepted_quote_id, request_id, worker_id, agreed_amount_pkr, quote_status)
    references public.quotes (id, request_id, worker_id, amount_pkr, status),
  unique (id, status)
);
create unique index one_active_booking_per_worker on public.bookings (worker_id)
  where status in ('confirmed', 'in_progress');

create table public.reviews (
  booking_id uuid primary key,
  required_status public.booking_status generated always as ('completed'::public.booking_status) stored,
  rating smallint not null check (rating between 1 and 5),
  comment text check (length(comment) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (booking_id, required_status) references public.bookings (id, status)
);

create view public.worker_availability with (security_invoker = true) as
select w.id as worker_id,
       w.online_preference and not exists (
         select 1 from public.bookings b
         where b.worker_id = w.id and b.status in ('confirmed', 'in_progress')
       ) as bookable
from public.workers w;

create view public.worker_reputation with (security_invoker = true) as
select w.id as worker_id,
       count(b.id) as completed_jobs,
       count(r.rating) as review_count,
       round(avg(r.rating), 1) as average_rating
from public.workers w
left join public.bookings b on b.worker_id = w.id and b.status = 'completed'
left join public.reviews r on r.booking_id = b.id
group by w.id;

alter table public.workers enable row level security;
alter table public.customers enable row level security;
alter table public.service_requests enable row level security;
alter table public.messages enable row level security;
alter table public.quotes enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

revoke all on public.workers, public.customers, public.service_requests, public.messages,
  public.quotes, public.bookings, public.reviews, public.worker_availability, public.worker_reputation
  from public, anon, authenticated;

grant select, insert, update, delete on public.workers, public.customers, public.service_requests,
  public.messages, public.quotes, public.bookings, public.reviews to service_role;
grant select on public.worker_availability, public.worker_reputation to service_role;

commit;
