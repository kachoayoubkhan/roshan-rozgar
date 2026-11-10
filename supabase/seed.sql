begin;

insert into public.workers
  (id, display_name, trade, experience_years, service_area, latitude, longitude, online_preference, visit_charge_pkr, onboarding_method)
values
  ('00000000-0000-4000-8000-000000000001', 'Ali Raza', 'plumber', 5, 'G-11', 33.675, 73.004, true, 2500, 'seed'),
  ('00000000-0000-4000-8000-000000000002', 'Imran Khan', 'plumber', 7, 'G-10', 33.677, 73.016, true, 2700, 'seed'),
  ('00000000-0000-4000-8000-000000000003', 'Waqas Ahmed', 'plumber', 4, 'F-10', 33.693, 73.013, true, 2800, 'seed'),
  ('00000000-0000-4000-8000-000000000004', 'Sana Akram', 'electrician', 6, 'G-11', 33.673, 72.986, true, 2000, 'seed'),
  ('00000000-0000-4000-8000-000000000005', 'Bilal Aslam', 'ac-technician', 4, 'G-10', 33.673, 73.011, true, 3000, 'seed'),
  ('00000000-0000-4000-8000-000000000006', 'Farah Noor', 'carpenter', 3, 'F-10', 33.696, 73.012, false, 2300, 'seed')
on conflict (id) do nothing;

insert into public.customers (id, display_name, service_area) values
  ('00000000-0000-4000-8000-000000000101', 'Ahmed Khan', 'G-11')
on conflict (id) do nothing;

-- Open walkthrough request, plus historical jobs and one engaged worker.
insert into public.service_requests (id, customer_id, trade, issue_description, service_area, urgency, preferred_time, status)
values ('00000000-0000-4000-8000-000000000200', '00000000-0000-4000-8000-000000000101',
        'plumber', 'The kitchen pipe is leaking.', 'G-11', 'today', '2026-11-10 16:00:00+05', 'open')
on conflict (id) do nothing;

insert into public.service_requests (id, customer_id, trade, issue_description, service_area, urgency, preferred_time, status)
select ('00000000-0000-4000-8000-00000000020' || n)::uuid,
       '00000000-0000-4000-8000-000000000101',
       case when n = 6 then 'ac-technician'::public.trade else 'plumber'::public.trade end,
       case when n = 6 then 'AC is no longer cooling.' else 'Example plumbing repair.' end,
       'G-11', 'today', '2026-11-10 16:00:00+05'::timestamptz - (6 - n) * interval '1 day', 'booked'
from generate_series(1, 6) as sample(n)
on conflict (id) do nothing;

insert into public.quotes (id, request_id, worker_id, amount_pkr, status, accepted_at)
select ('00000000-0000-4000-8000-00000000030' || n)::uuid, r.id,
       case when n = 6 then '00000000-0000-4000-8000-000000000005'::uuid
            else '00000000-0000-4000-8000-000000000001'::uuid end,
       case when n = 6 then 3000 else 2500 end,
       'accepted', r.preferred_time - interval '2 hours'
from generate_series(1, 6) as sample(n)
join public.service_requests r on r.id = ('00000000-0000-4000-8000-00000000020' || n)::uuid
on conflict (id) do nothing;

insert into public.bookings (id, request_id, worker_id, customer_id, accepted_quote_id, agreed_amount_pkr, scheduled_time, status)
select ('00000000-0000-4000-8000-00000000040' || n)::uuid,
       r.id, q.worker_id, r.customer_id, q.id, q.amount_pkr, r.preferred_time,
       case when n = 6 then 'confirmed'::public.booking_status else 'completed'::public.booking_status end
from generate_series(1, 6) as sample(n)
join public.quotes q on q.id = ('00000000-0000-4000-8000-00000000030' || n)::uuid
join public.service_requests r on r.id = q.request_id
on conflict (id) do nothing;

insert into public.reviews (booking_id, rating)
select ('00000000-0000-4000-8000-00000000040' || n)::uuid, case when n = 3 then 4 else 5 end
from generate_series(1, 5) as sample(n)
on conflict (booking_id) do nothing;

commit;
