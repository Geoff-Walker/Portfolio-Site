/* Archie floating chat — shared across all pages */

(function () {
  const btn   = document.querySelector('.archie-fab-btn');
  const panel = document.querySelector('.archie-panel');
  const body  = document.querySelector('.archie-panel-body');
  const form  = document.querySelector('.archie-panel-foot');
  const input = form && form.querySelector('input');
  const send  = form && form.querySelector('button');
  if (!btn || !panel || !body) return;

  /* ── toggle ── */
  let open = false;

  btn.addEventListener('click', () => {
    open = !open;
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open && body.children.length === 0) seed();
    if (open && input) setTimeout(() => input.focus(), 200);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      open = false;
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── seeded opener ── */
  function seed() {
    addMsg('bot', "I'm Archie — Geoff's orchestrator agent. Ask me anything about his work, the systems he's built, or the stack behind them.");
  }

  /* ── message rendering ── */
  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = 'ap-msg ' + role;
    if (role === 'bot') {
      const name = document.createElement('span');
      name.className = 'ap-name';
      name.textContent = 'Archie';
      el.appendChild(name);
    }
    el.appendChild(document.createTextNode(text));
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function addThinking() {
    const el = document.createElement('div');
    el.className = 'ap-msg bot thinking';
    const name = document.createElement('span');
    name.className = 'ap-name';
    name.textContent = 'Archie';
    el.appendChild(name);
    el.appendChild(document.createTextNode('Thinking…'));
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  const history = [];

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input) return;
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      sendMsg(q);
    });
  }

  async function sendMsg(q) {
    history.push({ role: 'user', content: q });
    addMsg('user', q);
    const thinking = addThinking();
    if (send)  send.disabled  = true;
    if (input) input.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      thinking.remove();
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const text = data.reply || 'Something went wrong — try again in a moment.';
      history.push({ role: 'assistant', content: text });
      addMsg('bot', text);
    } catch (err) {
      thinking.remove();
      addMsg('bot', 'Something went wrong. Try again in a moment.');
      console.error(err);
    } finally {
      if (send)  send.disabled  = false;
      if (input) { input.disabled = false; input.focus(); }
    }
  }
})();
