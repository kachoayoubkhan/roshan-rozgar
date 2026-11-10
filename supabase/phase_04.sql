begin;

create or replace function public.marketplace_action(
  p_actor uuid, p_action text, p_request uuid default null, p_worker uuid default null,
  p_quote uuid default null, p_amount integer default null, p_message text default null,
  p_time timestamptz default null, p_online boolean default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  job public.service_requests%rowtype;
  worker public.workers%rowtype;
  quote public.quotes%rowtype;
  booking public.bookings%rowtype;
  sender public.message_sender;
  result uuid;
begin
  if p_actor is null then
    raise sqlstate 'PT403' using message = 'Open the app in your original browser session.';
  end if;

  if p_action = 'availability' then
    if p_online is null then
      raise sqlstate 'PT422' using message = 'Choose an availability preference.';
    end if;
    update public.workers set online_preference = p_online
    where id = p_actor and onboarding_method <> 'seed' returning id into result;
    if not found then raise sqlstate 'PT403' using message = 'Save your worker profile first.'; end if;
    return result;
  end if;

  select * into job from public.service_requests where id = p_request for update;
  if not found or (job.customer_id is distinct from p_actor and job.selected_worker_id is distinct from p_actor) then
    raise sqlstate 'PT404' using message = 'This job is unavailable in this browser session.';
  end if;
  if job.customer_id = p_actor then sender := 'customer'; else sender := 'worker'; end if;

  if p_action = 'select' then
    if sender <> 'customer' then raise sqlstate 'PT403' using message = 'Only the customer can choose a worker.'; end if;
    if job.status = 'open' and job.selected_worker_id = p_worker then return job.id; end if;
    if job.status <> 'open' or job.selected_worker_id is not null then
      raise sqlstate 'PT409' using message = 'This request already has a worker or is closed.';
    end if;
    select * into worker from public.workers where id = p_worker for update;
    if not found or worker.id = p_actor or worker.trade <> job.trade or worker.onboarding_method = 'seed'
       or not worker.online_preference or exists (
         select 1 from public.bookings b where b.worker_id = p_worker and b.status in ('confirmed', 'in_progress')
       ) then
      raise sqlstate 'PT409' using message = 'This worker is no longer available for this request. Choose another worker.';
    end if;
    update public.service_requests set selected_worker_id = worker.id where id = job.id;
    return job.id;
  end if;

  if job.selected_worker_id is null then
    raise sqlstate 'PT409' using message = 'Choose a worker to start this conversation.';
  end if;

  if p_action in ('start', 'complete') then
    if sender <> 'worker' then raise sqlstate 'PT403' using message = 'Only the selected worker can update job progress.'; end if;
    update public.bookings
    set status = case when p_action = 'start' then 'in_progress'::public.booking_status else 'completed'::public.booking_status end
    where request_id = job.id and worker_id = p_actor
      and ((p_action = 'start' and status = 'confirmed') or (p_action = 'complete' and status = 'in_progress'))
    returning id into result;
    if not found then raise sqlstate 'PT409' using message = 'This job cannot move to that status.'; end if;
    return result;
  end if;

  if p_action = 'review' then
    if sender <> 'customer' then raise sqlstate 'PT403' using message = 'Only the customer can leave a review.'; end if;
    if p_amount is null or p_amount not between 1 and 5 then
      raise sqlstate 'PT422' using message = 'Choose a rating from 1 to 5 stars.';
    end if;
    if length(coalesce(p_message, '')) > 1000 then
      raise sqlstate 'PT422' using message = 'Feedback must be 1,000 characters or fewer.';
    end if;
    select * into booking from public.bookings
      where request_id = job.id and customer_id = p_actor and worker_id = job.selected_worker_id;
    if not found or booking.status <> 'completed'::public.booking_status then
      raise sqlstate 'PT409' using message = 'Reviews are only available after the job is completed.';
    end if;
    if exists (select 1 from public.reviews where booking_id = booking.id) then
      raise sqlstate 'PT409' using message = 'You have already reviewed this booking.';
    end if;
    insert into public.reviews (booking_id, rating, comment)
      values (booking.id, p_amount, nullif(btrim(coalesce(p_message, '')), ''))
      returning booking_id into result;
    return result;
  end if;

  if p_action = 'message' then
    if job.status in ('declined', 'cancelled') or exists (
      select 1 from public.bookings b where b.request_id = job.id and b.status in ('completed', 'cancelled')
    ) then
      raise sqlstate 'PT409' using message = 'This conversation is closed.';
    end if;
    if p_message is null or length(btrim(p_message)) not between 1 and 4000 then
      raise sqlstate 'PT422' using message = 'Enter a message of up to 4,000 characters.';
    end if;
    insert into public.messages (request_id, worker_id, sender_role, message_text)
      values (job.id, job.selected_worker_id, sender, btrim(p_message)) returning id into result;
    return result;
  end if;

  if job.status not in ('open', 'quoted', 'price_agreed') then
    raise sqlstate 'PT409' using message = 'This request is already booked or closed.';
  end if;

  select * into quote from public.quotes q
    where q.request_id = job.id and q.worker_id = job.selected_worker_id and q.status in ('proposed', 'accepted')
    order by q.created_at desc, q.id desc limit 1;

  if p_action = 'quote' then
    if sender <> 'worker' then raise sqlstate 'PT403' using message = 'Only the selected worker can send a quote.'; end if;
    if p_amount is null or p_amount not between 1 and 1000000 then
      raise sqlstate 'PT422' using message = 'Enter a whole PKR amount between 1 and 1,000,000.';
    end if;
    if quote.id is distinct from p_quote or quote.status = 'accepted' then
      raise sqlstate 'PT409' using message = 'The quote has changed or is accepted. Review the latest quote first.';
    end if;
    update public.quotes set status = 'rejected', accepted_at = null where id = quote.id;
    insert into public.quotes (request_id, worker_id, amount_pkr)
      values (job.id, job.selected_worker_id, p_amount) returning id into result;
    update public.service_requests set status = 'quoted' where id = job.id;
    return result;
  end if;

  if p_action in ('accept', 'revise', 'confirm') then
    if sender <> 'customer' then raise sqlstate 'PT403' using message = 'Only the customer can agree to a price or confirm a booking.'; end if;
    if quote.id is null or quote.id is distinct from p_quote then
      raise sqlstate 'PT409' using message = 'The quote has changed. Review the latest price and try again.';
    end if;
    if p_action = 'accept' then
      if job.status <> 'quoted' or quote.status <> 'proposed' then
        raise sqlstate 'PT409' using message = 'This quote is no longer waiting for acceptance.';
      end if;
      update public.quotes set status = 'accepted', accepted_at = now() where id = quote.id;
      update public.service_requests set status = 'price_agreed' where id = job.id;
      return quote.id;
    end if;
    if p_action = 'revise' then
      update public.quotes set status = 'rejected', accepted_at = null where id = quote.id;
      update public.service_requests set status = 'open' where id = job.id;
      insert into public.messages (request_id, worker_id, sender_role, message_text)
        values (job.id, job.selected_worker_id, 'customer', 'Please send a revised quote. / Nayi qeemat batayein.');
      return job.id;
    end if;

    if job.status <> 'price_agreed' or quote.status <> 'accepted' then
      raise sqlstate 'PT409' using message = 'Accept the current quote before confirming a booking.';
    end if;
    if p_time is null or p_time <= now() then
      raise sqlstate 'PT422' using message = 'Choose a future date and time in Pakistan time.';
    end if;

    select * into worker from public.workers where id = job.selected_worker_id for update;
    if not found or not worker.online_preference or worker.trade <> job.trade or exists (
      select 1 from public.bookings b where b.worker_id = worker.id and b.status in ('confirmed', 'in_progress')
    ) then
      raise sqlstate 'PT409' using message = 'This worker is busy or offline. Your booking was not confirmed.';
    end if;

    begin
      insert into public.bookings (request_id, worker_id, customer_id, accepted_quote_id, agreed_amount_pkr, scheduled_time)
        values (job.id, worker.id, job.customer_id, quote.id, quote.amount_pkr, p_time) returning id into result;
    exception when unique_violation then
      raise sqlstate 'PT409' using message = 'This worker is busy or the job was already booked.';
    end;
    update public.service_requests set status = 'booked' where id = job.id;
    return result;
  end if;

  if p_action in ('decline', 'cancel') then
    if (p_action = 'decline' and sender <> 'worker') or (p_action = 'cancel' and sender <> 'customer') then
      raise sqlstate 'PT403' using message = 'Only the appropriate participant can close this request.';
    end if;
    update public.quotes set status = 'rejected', accepted_at = null where id = quote.id;
    update public.service_requests
    set status = case when p_action = 'decline' then 'declined'::public.request_status else 'cancelled'::public.request_status end
    where id = job.id;
    return job.id;
  end if;
  raise sqlstate 'PT422' using message = 'This action is unsupported.';
end;
$$;

create or replace function public.marketplace_job(p_actor uuid, p_request uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'role', case when r.customer_id = p_actor then 'customer' else 'worker' end,
    'trade', r.trade, 'problem', r.issue_description, 'area', r.service_area,
    'urgency', r.urgency, 'preferred_time', r.preferred_time, 'preferred_date', r.preferred_date,
    'budget_pkr', r.budget_pkr, 'status', r.status,
    'worker', w.display_name, 'customer', c.display_name,
    'quote', (select jsonb_build_object('id', q.id, 'amount', q.amount_pkr, 'status', q.status)
              from public.quotes q where q.request_id = r.id and q.worker_id = w.id and q.status in ('proposed', 'accepted')
              order by q.created_at desc, q.id desc limit 1),
    'booking', (select jsonb_build_object('id', b.id, 'amount', b.agreed_amount_pkr, 'status', b.status, 'time', b.scheduled_time)
                from public.bookings b where b.request_id = r.id and b.worker_id = w.id),
    'review', (select jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at)
               from public.bookings b
               join public.reviews rv on rv.booking_id = b.id
               where b.request_id = r.id and b.worker_id = w.id),
    'messages', coalesce((
      select jsonb_agg(m order by m.created_at, m.id) from (
        select id, sender_role, message_text, created_at from public.messages
        where request_id = r.id and worker_id = w.id and message_text is not null
        order by created_at desc, id desc limit 200
      ) m
    ), '[]'::jsonb)
  )
  from public.service_requests r
  join public.workers w on w.id = r.selected_worker_id
  join public.customers c on c.id = r.customer_id
  where r.id = p_request and p_actor in (r.customer_id, r.selected_worker_id);
$$;

revoke all on function public.marketplace_action(uuid,text,uuid,uuid,uuid,integer,text,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.marketplace_action(uuid,text,uuid,uuid,uuid,integer,text,timestamptz,boolean) to service_role;

commit;
