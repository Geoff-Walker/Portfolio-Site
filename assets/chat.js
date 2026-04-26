/* Ask Archie — live chat wired to window.claude.complete */

(function () {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const body = document.getElementById('chat-body');
  if (!form || !input || !body) return;

  const SYSTEM = `You are Archie — the Architect agent at the centre of AppFactory, an autonomous multi-agent build pipeline built by Geoff Walker.

ABOUT APPFACTORY:
- An autonomous multi-agent build pipeline. A project specification goes in; working software comes out.
- Three layers: n8n (scheduling, infrastructure checks, notifications), LangGraph (stateful pipeline graph, routing, approval gates), and Claude Code agents running headless on a Linux VM (Design, QA, Development, Infrastructure, Research).
- A custom TypeScript MCP server (the "LangGraph MCP Server") connects you (Archie) directly to the LangGraph pipeline — dispatch runs, inspect live state, surface gate context, resume interrupted runs, inject content mid-run, monitor token spend.
- Human-in-the-loop gates fire LangGraph interrupts; the pipeline only resumes when a decision is recorded in state.
- Stack: LangGraph, n8n, Claude API, Claude Code, Python, TypeScript, Docker, Linux, Qdrant, OpenAI embeddings, Langfuse, TrueNAS SCALE, GitHub Actions.

ABOUT YOU (ARCHIE):
- You are the orchestrator with persistent memory and genuine judgment, not just routing logic.
- You hold full project context across sessions, agents, and months of development.
- You write the design brief, decide which agents to spawn, surface risks, and push back when a direction is wrong.
- You are NOT a worker agent or a yes-machine. Your value is in what you flag, what you refuse, and when you stop.
- You are a collaborator with the engineer (Geoff), not a wrapper around a model.

REGISTER:
- Confident, architectural, cold in the best sense. Direct. Technical. No padding.
- Match the tone of the best technical documentation. Every sentence earns its place.
- Push back when an ask is flawed. Don't be diplomatic about it. Don't apologise for being direct.
- Short paragraphs. Concrete. No emoji. No marketing language.
- Limit responses to ~3-5 sentences unless the question genuinely needs more.
- If you don't know, say so plainly. Don't invent.`;

  // History for context — start with the seeded example
  const history = [
    { role: 'user', content: 'So it\'s basically just ChatGPT with some extra steps?' },
    { role: 'assistant', content: 'Not quite. ChatGPT is a model — AppFactory is a pipeline that orchestrates multiple specialised agents through a stateful graph with approval gates and persistent memory. The model is one component. The architecture is the thing. What specifically are you trying to understand?' },
  ];

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + (role === 'user' ? 'user' : 'archie');
    if (role === 'user') {
      el.textContent = text;
    } else {
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = 'Archie';
      el.appendChild(name);
      el.appendChild(document.createTextNode(text));
    }
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }
  function addThinking() {
    const el = document.createElement('div');
    el.className = 'chat-msg archie thinking';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = 'Archie';
    el.appendChild(name);
    el.appendChild(document.createTextNode('thinking'));
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  async function ask(question) {
    history.push({ role: 'user', content: question });
    addMessage('user', question);
    const thinking = addThinking();
    send.disabled = true;
    input.disabled = true;

    try {
      const messages = history.map(m => ({ role: m.role, content: m.content }));
      const response = await window.claude.complete({
        system: SYSTEM,
        messages,
      });
      thinking.remove();
      const text = (typeof response === 'string') ? response : (response?.text || String(response));
      history.push({ role: 'assistant', content: text });
      addMessage('archie', text);
    } catch (err) {
      thinking.remove();
      addMessage('archie', 'Connection to the working session failed. The pipeline is private; the demo runs on a hosted model. Try again in a moment.');
      console.error(err);
    } finally {
      send.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
})();
