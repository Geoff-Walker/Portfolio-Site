/* =========================================================================
   TelegramPhone — reusable JSX component set for Pippa's chat chrome.
   Depends on telegram-chat.css and colors_and_type.css.
   Exposes on window: TelegramPhone, StatusBar, ChatHeader, Bubble, Typing, InputBar, Icon
   ========================================================================= */

const { useEffect, useRef, useState } = React;

/* ---------- Icon primitives (inline SVG) ---------- */
/* Stroke-style. 24x24 viewBox. Color via currentColor. */

const ICONS = {
  // chat chrome
  chevronLeft: (
    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
  ),
  moreVertical: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="5"  r="1"></circle>
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  ),
  paperclip: (
    <svg viewBox="0 0 24 24">
      <path d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49"></path>
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24">
      <rect x="9" y="2" width="6" height="12" rx="3"></rect>
      <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  ),
  // status bar
  // Android-style stepped signal bars (4 filled)
  signal: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="3"  y="15" width="3" height="6"  rx="0.5"></rect>
      <rect x="9"  y="11" width="3" height="10" rx="0.5"></rect>
      <rect x="15" y="7"  width="3" height="14" rx="0.5"></rect>
      <rect x="21" y="3"  width="3" height="18" rx="0.5" opacity="0"></rect>
    </svg>
  ),
  // Android-style solid wifi fan
  wifi: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 4C7.8 4 4 5.7 1.2 8.4l1.4 1.4C5 7.4 8.3 6 12 6s7 1.4 9.4 3.8l1.4-1.4C20 5.7 16.2 4 12 4z"/>
      <path d="M12 9c-2.7 0-5.2 1-7 2.8l1.4 1.4A7.8 7.8 0 0112 11c2.1 0 4.1.8 5.6 2.2l1.4-1.4A9.8 9.8 0 0012 9z"/>
      <path d="M12 14c-1.4 0-2.7.5-3.7 1.4l1.4 1.4A3.8 3.8 0 0112 16c.9 0 1.7.3 2.3.8l1.4-1.4c-1-.9-2.3-1.4-3.7-1.4z"/>
      <circle cx="12" cy="19.5" r="1.3"/>
    </svg>
  ),
  // Pill battery with "83" inside
  battery: (
    <svg viewBox="0 0 30 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="0.75" y="0.75" width="26" height="14.5" rx="4.5"></rect>
      <rect x="27.5" y="5"    width="1.8" height="6"   rx="0.6" fill="currentColor" stroke="none"></rect>
      <text x="13.75" y="11.2" fontSize="8" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif">83</text>
    </svg>
  ),
  // Smiley for composer
  smile: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"></circle>
      <circle cx="9" cy="10" r="0.5" fill="currentColor"></circle>
      <circle cx="15" cy="10" r="0.5" fill="currentColor"></circle>
      <path d="M8.5 14.5a4 4 0 007 0"></path>
    </svg>
  ),
  // design-block icons (larger outline)
  bookOpen: (
    <svg viewBox="0 0 24 24">
      <path d="M2 3h7a4 4 0 014 4v14a3 3 0 00-3-3H2z"></path>
      <path d="M22 3h-7a4 4 0 00-4 4v14a3 3 0 013-3h8z"></path>
    </svg>
  ),
  toggleRight: (
    <svg viewBox="0 0 24 24">
      <rect x="1" y="5" width="22" height="14" rx="7"></rect>
      <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none"></circle>
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
};

function Icon({ name, ...rest }) {
  const el = ICONS[name];
  if (!el) return null;
  return React.cloneElement(el, {
    ...rest,
    width: rest.width || 24,
    height: rest.height || 24,
    fill: rest.fill || "none",
    stroke: "currentColor",
    strokeWidth: rest.strokeWidth || 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  });
}

/* ---------- Status bar ---------- */

function StatusBar({ time = "09:41" }) {
  return (
    <div className="tg-statusbar">
      <span className="tg-statusbar__time">{time}</span>
      <span className="tg-statusbar__icons">
        <Icon name="signal" />
        <Icon name="wifi" />
        <Icon name="battery" />
      </span>
    </div>
  );
}

/* ---------- Chat header ---------- */

function ChatHeader({ name = "Pippa", sub = "bot", avatar }) {
  const initial = (avatar || name || "P").charAt(0).toUpperCase();
  return (
    <div className="tg-header">
      <div className="tg-header__back" aria-hidden="true">
        <Icon name="chevronLeft" />
      </div>
      <div className="tg-header__avatar" aria-hidden="true">{initial}</div>
      <div className="tg-header__identity">
        <div className="tg-header__name">{name}</div>
        <div className="tg-header__sub">{sub}</div>
      </div>
      <div className="tg-header__menu" aria-hidden="true">
        <Icon name="moreVertical" />
      </div>
    </div>
  );
}

/* ---------- Bubble ---------- */

function Bubble({ from, text, time, follow = false, visible = true, pos = 0 }) {
  const isUser = from === "user";
  const style = isUser ? { "--pos": pos } : undefined;
  return (
    <div
      style={style}
      className={[
        "tg-bubble",
        isUser ? "tg-bubble--user" : "tg-bubble--pippa",
        follow ? "is-follow" : "",
        visible ? "is-in" : "",
      ].join(" ")}
    >
      <span>{text}</span>
      <span className="tg-bubble__ts" aria-hidden="true">
        {time}
        {isUser && <span className="tg-bubble__ticks" aria-hidden="true"></span>}
      </span>
      <span className="sr-only">
        {isUser ? "You: " : "Pippa: "}{text}
      </span>
    </div>
  );
}

/* ---------- Typing indicator ---------- */

function Typing({ visible = true }) {
  return (
    <div
      className={["tg-typing", visible ? "is-in" : ""].join(" ")}
      aria-hidden="true"
    >
      <span className="tg-typing__dot"></span>
      <span className="tg-typing__dot"></span>
      <span className="tg-typing__dot"></span>
    </div>
  );
}

/* ---------- Input bar ---------- */

function InputBar() {
  return (
    <div className="tg-input" aria-hidden="true">
      <div className="tg-input__btn"><Icon name="smile" /></div>
      <input
        type="text"
        className="tg-input__field"
        placeholder="Message"
        readOnly
        tabIndex={-1}
      />
      <div className="tg-input__btn"><Icon name="paperclip" /></div>
      <div className="tg-input__btn tg-input__btn--send"><Icon name="mic" /></div>
    </div>
  );
}

/* ---------- Phone frame (composable) ---------- */

function TelegramPhone({ children, statusBarTime = "09:41" }) {
  return (
    <div className="tg-phone" role="img" aria-label="Telegram chat with Pippa">
      <StatusBar time={statusBarTime} />
      {children}
    </div>
  );
}

Object.assign(window, {
  TelegramPhone, StatusBar, ChatHeader, Bubble, Typing, InputBar, Icon, ICONS,
});
