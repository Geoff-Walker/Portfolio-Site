/* =========================================================================
   Portfolio page sections — Pippa /pippa case study.
   Exposes on window: Hero, WhyPippa, ChatSection, HowDesigned, WhatIWontShow, Sources, Close
   ========================================================================= */

/* ---------- Section 1: Hero ---------- */

function Hero() {
  return (
    <section className="pp-hero" aria-labelledby="hero-title">
      <div className="pp-hero__grid">
        <div className="pp-hero__text">
          <p className="pp-hero__eyebrow"><span className="pp-hero__rule"></span>Portfolio · An AI welfare adviser</p>
          <h1 className="pp-hero__title" id="hero-title">Pippa.</h1>
          <p className="pp-hero__sub">An AI welfare adviser for people navigating the UK PIP process.</p>
          <p className="pp-hero__subline">Built to make one of the hardest paperwork tasks in the welfare system a little less hard.</p>
        </div>
        <div className="pp-hero__chat" aria-label="Live demo of a Pippa conversation">
          <div className="pp-hero__phone">
            <TelegramPhone>
              <ChatHeader name="Pippa" sub="bot" />
              <PippaConversation startOnVisible={true} visibleRatio={0.2} />
              <InputBar />
            </TelegramPhone>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 2: Why Pippa exists ---------- */

function WhyPippa() {
  return (
    <section className="pp-section" aria-labelledby="why-heading">
      <h2 className="sr-only" id="why-heading">Why Pippa exists</h2>
      <div className="pp-prose">
        <p>The UK Personal Independence Payment application is one of the hardest paperwork tasks in the welfare system. The form is long, the language is opaque, and the questions don't match how people actually describe their own lives. Rejected claimants frequently win on appeal — not because their conditions changed, but because the second time around they found a way to articulate what they'd already said.</p>
        <p>I know what filling it in feels like, because I've done it. Confused by the questions. Unsure how to phrase things without sounding either dramatic or dismissive. Caught between <em>am I overstating this?</em> and <em>am I being a burden?</em> You can finish the form feeling smaller than when you started.</p>
        <p>Pippa exists because better articulation shouldn't depend on being able to afford a welfare adviser. She guides claimants through the application the way a trained charity adviser would — patient, strictly scoped to the PIP process, working from the actual DWP rules and established claimant guidance.</p>
        <p className="pp-prose__note">I tested Pippa against my own reclaim. Over three sessions we worked through every activity, page by page, together. I submitted the form she helped me write. She helped me put things into words I'd never quite managed on my own.</p>
      </div>
    </section>
  );
}

/* ---------- Section 3: Quiet caption only (chat is now in the hero) ---------- */

function ChatSection() {
  const [captionVisible, setCaptionVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector("[data-convo-complete]");
      if (el && el.dataset.convoComplete === "true") {
        setCaptionVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-convo-complete"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pp-section pp-chat-caption-section" aria-hidden={!captionVisible}>
      <div className="pp-prose">
        <p className={["pp-chat-caption", captionVisible ? "is-in" : ""].join(" ")}>
          <em>Example conversation — fictional demo. Pippa's disclaimer, form routing, and mobility-question pattern are shown verbatim from the agent specification. No real user sessions are ever published.</em>
        </p>
      </div>
    </section>
  );
}

/* ---------- Section 4: How Pippa is designed ---------- */

const BLOCKS = [
  {
    icon: "bookOpen",
    title: "Knowledge injection",
    body: "At session start, Pippa loads a structured knowledge base: all twelve PIP activities, every descriptor, the official DWP wording, and the points each descriptor carries. She doesn't rely on general training knowledge of welfare benefits — she works from the actual rules. If DWP updates the descriptors, the knowledge base updates, and Pippa is immediately current.",
  },
  {
    icon: "toggleRight",
    title: "Two-mode architecture",
    body: (<>Pippa operates in two distinct modes. In <strong className="tg-fg">assessment mode</strong>, she holds open-ended conversations about conditions, mapping what someone describes to the descriptors that fit. In <strong className="tg-fg">form-filling mode</strong>, she works through the application page by page, helping the claimant write answers that accurately reflect their situation in the language the form expects. Switching modes is explicit and consent-based.</>),
  },
  {
    icon: "bookmark",
    title: "Session continuity",
    body: "Pippa's memory is structured state, not chat history. A claimant can step away for days or weeks and return without re-explaining themselves. The state record holds what's been established — conditions named, descriptors mapped, sections of the form completed — and persists between sessions regardless of how long the gap.",
  },
  {
    icon: "shield",
    title: "Safeguarding",
    body: "Pippa is designed for vulnerable users. She handles distress with explicit protocols: she slows down, she never pushes, she signposts to Samaritans when content crosses thresholds. She redirects requests for emotional support outside the PIP scope kindly and consistently. She never asks for or stores personally identifying information; claimants write PII directly onto the form themselves.",
  },
];

function HowDesigned() {
  return (
    <section className="pp-section" aria-labelledby="how-heading">
      <h2 className="sr-only" id="how-heading">How Pippa is designed</h2>
      <div className="pp-blocks">
        {BLOCKS.map((b, i) => (
          <article className="pp-block" key={i}>
            <div className="pp-block__icon" aria-hidden="true"><Icon name={b.icon} /></div>
            <h3 className="pp-block__title">{b.title}</h3>
            <p className="pp-block__body">{b.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Section 5: What I won't show ---------- */

function WhatIWontShow() {
  return (
    <section className="pp-quiet" aria-labelledby="wont-heading">
      <h2 className="sr-only" id="wont-heading">What I won't show</h2>
      <div className="pp-prose">
        <p className="pp-quiet__lead">There are no real user conversations on this page. There never will be.</p>
        <p>Real conversations happen with vulnerable people at vulnerable moments in their lives. They are not portfolio content.</p>
        <p>The example above is a fictional demonstration. It illustrates tone, pacing, and domain handling. It is not anyone's actual session.</p>
      </div>
    </section>
  );
}

/* ---------- Section 6: Sources ---------- */

function Sources() {
  return (
    <section className="pp-section pp-sources" aria-labelledby="sources-heading">
      <div className="pp-prose">
        <h2 className="pp-sources__heading" id="sources-heading">Sources</h2>
        <p>Pippa's knowledge base was built from publicly available material: the DWP's official PIP2 claim form, the AR1 Award Review form, and the DWP PIP Assessment Guide used by assessors. The guidance layer cross-references published claimant guides from Citizens Advice, Disability Rights UK (PIP Guide to Claiming, 2025), and Scope.</p>
        <p>These organisations are not affiliated with Pippa and do not endorse this project. Their published guidance informed the internal knowledge base. No material is reproduced on the page.</p>
      </div>
    </section>
  );
}

/* ---------- Section 7: Close ---------- */

function Close() {
  return (
    <section className="pp-close" aria-labelledby="close-heading">
      <h2 className="sr-only" id="close-heading">Close</h2>
      <p className="pp-close__text">Pippa is not a publicly deployed service. She's a carefully designed thinking piece — a demonstration of how Claude can be scoped, given domain knowledge, and given ethical guardrails for a specific, sensitive task.</p>
      <div className="pp-close__links">
        <a href="/" className="pp-close__link">← Home</a>
        <a href="https://linkedin.com/in/geoff-walker-a3ab02227" className="pp-close__link" target="_blank" rel="noopener">LinkedIn</a>
        <a href="mailto:geoffwalker@outlook.com" className="pp-close__link">Email</a>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, WhyPippa, ChatSection, HowDesigned, WhatIWontShow, Sources, Close });
