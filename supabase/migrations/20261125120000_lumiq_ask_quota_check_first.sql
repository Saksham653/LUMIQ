-- The daily Ask limits now check first and count second.
--
-- Before, every call was added to the whole app's counter and to the phone's
-- counter, and only then compared with the limits. So a call that was refused
-- still counted, and one phone id repeating itself could use up the whole
-- app's day for everyone. Now a refused call moves no counter and leaves no
-- row behind, and one id is held to its own share.
--
-- What this does not do: a phone id is whatever the caller says it is, so a
-- script that makes up new ids can still use up the day. Only the new backend
-- (a server record per question, proof that the app is the real one) closes
-- that.
--
-- Same name, same arguments, same reply shape and same grants as before, so
-- the lumiq-ask function calls it unchanged.

create or replace function public.lumiq_take_ask_quota(
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
  v_dev_questions integer := 0;
  v_dev_calls integer := 0;
begin
  -- 'total' is the whole app's row, so it can never be a phone.
  if p_device is null or p_device = '' or p_device = 'total' then
    raise exception 'lumiq_take_ask_quota: bad device';
  end if;
  -- A missing value would compare as "unknown" and let every call through.
  if p_is_question is null or p_device_questions is null or p_total_questions is null then
    raise exception 'lumiq_take_ask_quota: missing value';
  end if;

  -- Today's whole-app row: made empty if this is the day's first call, then
  -- locked. Every call takes this one lock first, so calls are handled one at
  -- a time: two at the same moment can never both slip under a limit, and
  -- with a single lock they can never wait on each other.
  insert into public.lumiq_ask_usage (day, subject)
  values (v_day, 'total')
  on conflict (day, subject) do nothing;
  select * into v_total from public.lumiq_ask_usage
    where day = v_day and subject = 'total' for update;

  -- The phone's counters so far today, if it has asked anything yet. Nothing
  -- is written for it until a call is counted.
  select u.questions, u.calls into v_dev_questions, v_dev_calls
    from public.lumiq_ask_usage u
    where u.day = v_day and u.subject = p_device;
  if not found then
    v_dev_questions := 0;
    v_dev_calls := 0;
  end if;

  -- A question takes two or three calls (plan, maybe a corrected plan,
  -- answer), so calls are capped at four per allowed question. The limits
  -- are widened before multiplying so a very large limit cannot overflow.
  if v_dev_questions + v_question > p_device_questions
     or v_dev_calls + 1 > p_device_questions::bigint * 4 then
    return jsonb_build_object('allowed', false, 'reason', 'device_limit', 'questionsLeft', 0);
  end if;
  if v_total.questions + v_question > p_total_questions
     or v_total.calls + 1 > p_total_questions::bigint * 4 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'total_limit',
      'questionsLeft', greatest(p_device_questions - v_dev_questions, 0)
    );
  end if;

  -- Within both limits: only now is the call counted.
  update public.lumiq_ask_usage
    set questions = questions + v_question, calls = calls + 1
    where day = v_day and subject = 'total';
  insert into public.lumiq_ask_usage as u (day, subject, questions, calls)
  values (v_day, p_device, v_question, 1)
  on conflict (day, subject) do update
    set questions = u.questions + excluded.questions, calls = u.calls + 1;

  -- The first counted call of each day clears out counters older than two weeks.
  if v_total.calls = 0 then
    delete from public.lumiq_ask_usage where day < v_day - 14;
  end if;

  -- Questions left: the smaller of what this phone and the whole app still
  -- have today, so the app never promises more than exists.
  return jsonb_build_object(
    'allowed', true,
    'questionsLeft', greatest(
      least(
        p_device_questions - (v_dev_questions + v_question),
        p_total_questions - (v_total.questions + v_question)
      ),
      0
    )
  );
end;
$$;

-- create or replace keeps the earlier grants; repeated here so this file is
-- safe to run on its own.
revoke execute on function public.lumiq_take_ask_quota(text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.lumiq_take_ask_quota(text, boolean, integer, integer) to service_role;
