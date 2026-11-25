// LUMIQ landing page: entrances, the hero's live answer, the phone that follows "How it works", the rows that
// read themselves, and the query form.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- the nav gets its hairline once the page scrolls
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- each block enters once, as it scrolls into view
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          reveal.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

  // ---- the hero: the app's Ask screen answers its sample question, then marks each number as checked
  const demo = document.getElementById('demo');
  if (demo) {
    const QUESTION = 'What is the total Amount by Item?';
    const typed = demo.querySelector('.typed');
    const caret = demo.querySelector('.caret');
    const marks = [...demo.querySelectorAll('mark.num')];
    const count = demo.querySelector('.count');
    const finalState = () => {
      typed.textContent = QUESTION;
      caret.style.display = 'none';
      demo.classList.add('demo-answer', 'demo-done');
      marks.forEach((m) => m.classList.add('on'));
      count.textContent = String(marks.length);
    };
    const play = async () => {
      for (;;) {
        demo.classList.remove('demo-answer', 'demo-done');
        marks.forEach((m) => m.classList.remove('on'));
        count.textContent = '0';
        typed.textContent = '';
        caret.style.display = '';
        await sleep(700);
        for (const ch of QUESTION) {
          typed.textContent += ch;
          await sleep(ch === ' ' ? 70 : 38 + Math.round(Math.random() * 34));
        }
        caret.style.display = 'none';
        await sleep(450);
        demo.classList.add('demo-answer');
        await sleep(900);
        for (let i = 0; i < marks.length; i++) {
          marks[i].classList.add('on');
          count.textContent = String(i + 1);
          await sleep(520);
        }
        demo.classList.add('demo-done');
        await sleep(5200);
      }
    };
    if (reduced) finalState();
    else {
      // start once the phone is on screen
      const start = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start.disconnect();
          play();
        }
      });
      start.observe(demo);
    }
  }

  // ---- "How it works": the phone shows the step being read
  const steps = [...document.querySelectorAll('.step')];
  const shots = [...document.querySelectorAll('.phone-shot img')];
  if (steps.length && shots.length) {
    const show = (name) => {
      steps.forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
      shots.forEach((img) => img.classList.toggle('on', img.dataset.shot === name));
    };
    const stepObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) show(visible[0].target.dataset.screen);
      },
      { threshold: [0.35, 0.6, 0.85], rootMargin: '-20% 0px -20% 0px' },
    );
    steps.forEach((s) => stepObserver.observe(s));
    show(steps[0].dataset.screen);
  }

  // ---- the rows read themselves, one after another, when the table comes into view
  const table = document.querySelector('.reads-table');
  if (table) {
    const rows = [...table.querySelectorAll('.read')];
    const go = async () => {
      for (const r of rows) {
        r.classList.add('in');
        if (!reduced) await sleep(170);
      }
    };
    const t = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        t.disconnect();
        go();
      }
    }, { threshold: 0.3 });
    t.observe(table);
  }

  // ---- "Watch the film": scroll to it and play
  document.querySelectorAll('[data-play]').forEach((a) =>
    a.addEventListener('click', (ev) => {
      const video = document.getElementById('film-video');
      if (!video) return;
      ev.preventDefault();
      video.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => video.play().catch(() => {}), reduced ? 0 : 700);
    }),
  );

  // ---- the query form: stored in LUMIQ's database (insert only, nobody can read it from the page)
  const SUPABASE_URL = 'https://xuiqswtzvcsxqccgqoqk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Kod6w9x1s3w2rSMGyoiP7g_P2ammxv7'; // the public key: it can only add a message
  const form = document.getElementById('query-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const say = (text, kind, html) => {
      status.className = `form-status ${kind ?? ''}`;
      if (html) status.innerHTML = html;
      else status.textContent = text;
    };
    // when the message cannot be stored, it is not lost: it can go as a GitHub issue instead (public)
    const issueLink = (d) => {
      const title = `[${d.topic}] Message from ${d.name}`;
      const body = `${d.message}\n\n(Sent from the LUMIQ page. Contact details left out because issues are public.)`;
      return `https://github.com/Saksham653/LUMIQ/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    };
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = new FormData(form);
      if (String(f.get('company') || '').trim() !== '') {
        // a bot filled the hidden field: thank it and send nothing
        say('Thank you. Your message is on its way.', 'ok');
        form.reset();
        return;
      }
      const d = {
        name: String(f.get('name') || '').trim(),
        contact: String(f.get('contact') || '').trim(),
        topic: String(f.get('topic') || 'question'),
        message: String(f.get('message') || '').trim(),
        page: location.pathname.slice(0, 200),
      };
      if (!d.name) return say('Please write your name.', 'err'), form.elements.name.focus();
      if (d.contact.length < 3) return say('Please write an email or phone number, so the reply can reach you.', 'err'), form.elements.contact.focus();
      if (d.message.length < 5) return say('Please write a little more in the message.', 'err'), form.elements.message.focus();

      button.disabled = true;
      say('Sending...', '');
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lumiq_queries`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(d),
        });
        if (res.ok) {
          say('Thank you. Your message reached the maker; the reply will come to the contact you gave.', 'ok');
          form.reset();
        } else {
          say('', 'err', `It could not be sent just now. <a href="${issueLink(d)}" target="_blank" rel="noopener">Send it as a GitHub issue instead</a> (public, so leave out your phone number).`);
        }
      } catch {
        say('', 'err', `No connection. Check the internet and try again, or <a href="${issueLink(d)}" target="_blank" rel="noopener">send it as a GitHub issue</a>.`);
      } finally {
        button.disabled = false;
      }
    });
  }
})();
