/* =========================================================================
   PippaConversation — drives the 12-message Pippa/user conversation with
   typing indicators, fade-ups, and IntersectionObserver-triggered playback.
   Depends on TelegramPhone.jsx (Bubble, Typing, ChatHeader, InputBar).
   Exposes on window: PippaConversation, PIPPA_SCRIPT
   ========================================================================= */

const { useEffect: pcUseEffect, useRef: pcUseRef, useState: pcUseState } = React;

/* ---------- Script (verbatim from the brief) ---------- */

const PIPPA_SCRIPT = [
  { from: "pippa", time: "09:41", text: "Hi, I'm Pippa. Pippa stands for Personal Independence Payment, Personal Assistant." },
  { from: "pippa", time: "09:41", text: "I'm an AI assistant, here to help you understand PIP criteria and work through your form. This is guidance to help you — it's not legal advice, and I can't guarantee any outcome. For legal advice, a welfare rights adviser or Citizens Advice can help." },
  { from: "pippa", time: "09:41", text: "Before we start — is this a new claim, or are you renewing an existing award?" },
  { from: "user",  time: "09:42", text: "renewing" },
  { from: "pippa", time: "09:43", text: "Okay. Your form will either be an AR1 or an AR2 — the code is on the top page. Which one do you have?" },
  { from: "user",  time: "09:44", text: "AR1" },
  { from: "pippa", time: "09:45", text: "Perfect. Before we go near the form, I want to understand what you're dealing with day to day. Can you tell me a bit about your conditions? No rush — whatever you're comfortable sharing." },
  { from: "user",  time: "09:47", text: "pain all the time. can't always walk. some days are worse than others" },
  { from: "pippa", time: "09:48", text: "Thank you for telling me that. Living in that kind of uncertainty is exhausting on its own, before we even add the form on top." },
  { from: "pippa", time: "09:49", text: "Fluctuating conditions are one of the things PIP is worst at capturing — the form tends to ask \u201Chow far can you walk\u201D as if it's a fixed distance. Let's come at it a different way. If you think about the last 10 days, on how many would you say walking was really difficult — where you could only manage a few steps, or needed to stop?" },
  { from: "user",  time: "09:51", text: "7 maybe 8" },
  { from: "pippa", time: "09:52", text: "That's helpful. For PIP, that majority-of-days picture is what the assessment looks at, not one-off examples. I've noted it — we'll come back to it properly when we reach Activity 12." },
];

/* ---------- Helpers ---------- */

function prefersReducedMotion() {
  return typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- PippaConversation ---------- */

function PippaConversation({ autoplay = false, startOnVisible = true, visibleRatio = 0.4 }) {
  const chatRef = pcUseRef(null);
  const [items, setItems] = pcUseState([]);    // messages + typing entries currently rendered
  const [hasStarted, setHasStarted] = pcUseState(false);
  const [isComplete, setIsComplete] = pcUseState(false);
  const startedRef = pcUseRef(false);

  /* --- scroll the chat area as new items arrive --- */
  pcUseEffect(() => {
    const el = chatRef.current;
    if (el) {
      // direct scrollTop, NOT scrollIntoView
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

  /* --- IntersectionObserver trigger --- */
  pcUseEffect(() => {
    if (autoplay && !startedRef.current) {
      startedRef.current = true;
      setHasStarted(true);
      return;
    }
    if (!startOnVisible || startedRef.current) return;

    const phone = chatRef.current?.closest(".tg-phone");
    if (!phone) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= visibleRatio && !startedRef.current) {
            startedRef.current = true;
            setHasStarted(true);
          }
        }
      },
      { threshold: [visibleRatio] }
    );
    observer.observe(phone);
    return () => observer.disconnect();
  }, [autoplay, startOnVisible, visibleRatio]);

  /* --- playback engine --- */
  pcUseEffect(() => {
    if (!hasStarted) return;

    const reduced = prefersReducedMotion();
    const typingDur     = reduced ? 100  : 900;
    const openerGap     = reduced ? 60   : 400;
    const openerStall   = reduced ? 300  : 3500;
    const userGap       = reduced ? 60   : 400;
    const pippaGap      = reduced ? 60   : 400;
    const backToBackGap = reduced ? 60   : 600;

    let cancelled = false;
    const timers = [];
    const wait = (ms) => new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      timers.push(t);
    });

    const pushItem = (item) => {
      if (cancelled) return;
      setItems((prev) => [...prev, item]);
    };
    const replaceLast = (item) => {
      if (cancelled) return;
      setItems((prev) => [...prev.slice(0, -1), item]);
    };

    (async () => {
      // Messages 1..3 — opener, no typing indicator, 400ms gap.
      for (let i = 0; i < 3; i++) {
        pushItem({ kind: "msg", ...PIPPA_SCRIPT[i] });
        if (i < 2) await wait(openerGap);
      }
      await wait(openerStall);

      for (let i = 3; i < PIPPA_SCRIPT.length; i++) {
        const msg = PIPPA_SCRIPT[i];
        const prev = PIPPA_SCRIPT[i - 1];

        if (msg.from === "user") {
          // user messages: no typing indicator; 240ms fade-up.
          if (i !== 3) await wait(userGap);
          pushItem({ kind: "msg", ...msg });
        } else {
          // pippa message
          const gap = prev.from === "pippa" ? backToBackGap : pippaGap;
          await wait(gap);
          pushItem({ kind: "typing" });
          await wait(typingDur);
          // replace typing indicator with the message
          replaceLast({ kind: "msg", ...msg });
        }
      }

      if (!cancelled) setIsComplete(true);
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [hasStarted]);

  /* --- render --- */
  // Compute "follow" flag + gradient position for user bubbles.
  const totalUsers = PIPPA_SCRIPT.filter(m => m.from === "user").length;
  let userSeen = 0;
  const rendered = items.map((it, idx) => {
    if (it.kind === "typing") return { ...it, idx };
    const prev = items[idx - 1];
    const follow = prev && prev.kind === "msg" && prev.from === it.from;
    let pos = 0;
    if (it.from === "user") {
      pos = totalUsers > 1 ? (userSeen / (totalUsers - 1)) : 0;
      userSeen += 1;
    }
    return { ...it, idx, follow, pos };
  });

  return (
    <>
      {/* screen-reader-only running transcript */}
      <ol className="sr-only" aria-live="polite" aria-label="Conversation transcript">
        {items.filter(i => i.kind === "msg").map((m, i) => (
          <li key={i}><strong>{m.from === "user" ? "You" : "Pippa"}:</strong> {m.text}</li>
        ))}
      </ol>

      <div className="tg-chat" ref={chatRef} aria-hidden="false">
        {rendered.map((it) => (
          it.kind === "typing"
            ? <Typing key={`typing-${it.idx}`} visible={true} />
            : <Bubble
                key={`msg-${it.idx}`}
                from={it.from}
                text={it.text}
                time={it.time}
                follow={it.follow}
                pos={it.pos}
                visible={true}
              />
        ))}
      </div>
      {/* marker for parent components to detect completion */}
      <span
        className="sr-only"
        data-convo-complete={isComplete ? "true" : "false"}
      ></span>
    </>
  );
}

Object.assign(window, { PippaConversation, PIPPA_SCRIPT });
