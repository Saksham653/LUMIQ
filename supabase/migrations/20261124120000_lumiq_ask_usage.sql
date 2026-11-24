-- Daily question counters for the lumiq-ask Edge Function (the phone app's
-- built-in AI). Only that function, using the project's secret key, can read
-- or change them: no policies are defined, and anon/authenticated have no
-- grants.
--
-- A phone is stored only as a salted SHA-256 hash of the app's random
-- install id (never an account, name, phone number or IP address), and
-- counters older than 14 days are deleted. Days follow India time.

create table public.lumiq_ask_usage (
  day date not null,
  subject text not null, -- hashed install id, or 'total' for the whole app
  questions integer not null default 0,
  calls integer not null default 0,
  primary key (day, subject)
);

alter table public.lumiq_ask_usage enable row level security;
revoke all on table public.lumiq_ask_usage from anon, authenticated;

-- Counts one AI call (and one question when p_is_question) for the phone and
-- for the whole app, then says whether it is within today's limits. A
-- question takes two or three calls (plan, maybe a corrected plan, answer),
-- so calls are capped at four per allowed question.
create function public.lumiq_take_ask_quota(
  p_device text,
  p_is_question boolean,
  p_device_questions integer,
  p_total_questions integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
  v_question integer := case when p_is_question then 1 else 0 end;
  v_total public.lumiq_ask_usage;
  v_device public.lumiq_ask_usage;
  v_left integer;
begin
  insert into public.lumiq_ask_usage as u (day, subject, questions, calls)
  values (v_day, 'total', v_question, 1)
  on conflict (day, subject) do update
    set questions = u.questions + excluded.questions, calls = u.calls + 1
  returning * into v_total;

  -- The first call of each day clears out counters older than two weeks.
  if v_total.calls = 1 then
    delete from public.lumiq_ask_usage where day < v_day - 14;
  end if;

  insert into public.lumiq_ask_usage as u (day, subject, questions, calls)
  values (v_day, p_device, v_question, 1)
  on conflict (day, subject) do update
    set questions = u.questions + excluded.questions, calls = u.calls + 1
  returning * into v_device;

  v_left := greatest(p_device_questions - v_device.questions, 0);

  if v_device.questions > p_device_questions or v_device.calls > p_device_questions * 4 then
    return jsonb_build_object('allowed', false, 'reason', 'device_limit', 'questionsLeft', 0);
  end if;
  if v_total.questions > p_total_questions or v_total.calls > p_total_questions * 4 then
    return jsonb_build_object('allowed', false, 'reason', 'total_limit', 'questionsLeft', v_left);
  end if;
  return jsonb_build_object('allowed', true, 'questionsLeft', v_left);
end;
$$;

revoke execute on function public.lumiq_take_ask_quota(text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.lumiq_take_ask_quota(text, boolean, integer, integer) to service_role;
