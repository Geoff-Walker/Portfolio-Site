/* ────────────────────────────────────────────────────────────────
   Tom — shared shell behaviour for the XP indicator + pop-out.
   Loaded by every screen (one <script> tag). On load it:
     1. injects tom-xp.css,
     2. upgrades the canonical .xp-pill into the closed indicator,
     3. injects the pop-out and wires toggle / carousel / score tick.
   Mock note: the gold lead is hard-coded to guitar and the 2x badge
   is shown illustratively — real context-resolution (which track
   leads, whether a boost is live) is app logic, specced separately.
   ──────────────────────────────────────────────────────────────── */
(function(){
  var PILL_HTML = ''
    + '<span class="xpx-mult" id="xpxMult"><span class="xp-bolt" aria-hidden="true"></span>2&times;</span>'
    + '<span class="xpx-plus" id="xpxPlus">+15</span>'
    + '<span class="xp-bolt" aria-hidden="true"></span>'
    + '<span class="xpx-num" id="xpxNum">1,240 XP</span>'
    + '<span class="xpx-sep"></span>'
    + '<span class="xpx-chip lead"><span class="xo-ic xo-m-gui xo-gold"></span>2.3</span>'
    + '<span class="xpx-chip"><span class="xo-ic xo-m-key xo-ink"></span>1.2</span>'
    + '<span class="xpx-chip"><span class="xo-ic xo-m-the xo-ink"></span>3.1</span>';

  var POP_HTML = ''
    + '<div class="xo-pop" id="xo-pop" role="dialog" aria-label="XP and levels">'
    +   '<div class="xo-head">'
    +     '<div class="xo-heatrow">'
    +       '<div class="xo-hero"><span class="xo-hk">To spend</span>'
    +         '<span class="xo-big"><span class="xp-bolt"></span><span class="num">1,240</span><span class="lbl">XP</span></span></div>'
    +       '<div class="xo-suggest">'
    +         '<div class="xo-sg-main">'
    +           '<div class="xo-sg-eyebrow"><span class="xo-bolt2"></span> Tom suggests</div>'
    +           '<div class="xo-sg-view"><div class="xo-sg-track" id="xoTrack">'
    +             '<div class="xo-slide"><span class="xo-sg-task">Scales across the neck</span><span class="xo-sg-right"><span class="xo-sg-mult"><span class="xo-bolt2"></span>2&times; XP</span><button class="xo-sg-go">Start</button></span></div>'
    +             '<div class="xo-slide"><span class="xo-sg-task">Play your G major for Tom</span><span class="xo-sg-right"><button class="xo-sg-go">Start</button></span></div>'
    +             '<div class="xo-slide"><span class="xo-sg-task">Chord changes: C&ndash;G&ndash;D</span><span class="xo-sg-right"><button class="xo-sg-go">Start</button></span></div>'
    +           '</div></div>'
    +         '</div>'
    +         '<div class="xo-dots" id="xoDots">'
    +           '<button class="xo-dot active" data-i="0" aria-label="Suggestion 1"></button>'
    +           '<button class="xo-dot" data-i="1" aria-label="Suggestion 2"></button>'
    +           '<button class="xo-dot" data-i="2" aria-label="Suggestion 3"></button>'
    +         '</div>'
    +       '</div>'
    +     '</div>'
    +     '<div class="xo-stats">'
    +       '<div class="xo-stat" style="--c:var(--gold-text);"><span class="xo-k">Total earned</span><span class="xo-v">3,180</span><span class="xo-u">XP all-time</span></div>'
    +       '<div class="xo-stat" style="--c:var(--gal-bass);"><span class="xo-k">This week</span><span class="xo-v">+420</span><span class="xo-u">XP</span></div>'
    +       '<div class="xo-stat" style="--c:var(--note-Db);"><span class="xo-k">Pace</span><span class="xo-v">~350</span><span class="xo-u">XP / week avg</span></div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="xo-body">'
    +     '<p class="xo-eyebrow">Your levels <span class="hint">tap to open in Skills</span></p>'
    +     '<div class="xo-grid">'
    +       '<div class="xo-card lead"><div class="xo-ctop"><span class="xo-nm"><span class="xo-ic xo-m-gui xo-gold"></span>Guitar</span><span class="xo-lvl">2.3</span></div><div class="xo-bar"><span style="width:62%; background:var(--gold);"></span></div><p class="xo-grade">~ Trinity R&amp;P Grade 2</p></div>'
    +       '<div class="xo-card"><div class="xo-ctop"><span class="xo-nm"><span class="xo-ic xo-m-key xo-ink"></span>Keys</span><span class="xo-lvl">1.2</span></div><div class="xo-bar"><span style="width:34%; background:var(--gal-piano);"></span></div><p class="xo-grade">~ Pre-Grade 1</p></div>'
    +       '<div class="xo-card"><div class="xo-ctop"><span class="xo-nm"><span class="xo-ic xo-m-the xo-ink"></span>Theory</span><span class="xo-lvl">3.1</span></div><div class="xo-bar"><span style="width:18%; background:var(--note-Eb);"></span></div><p class="xo-grade">~ ABRSM Theory G3</p></div>'
    +       '<div class="xo-card"><div class="xo-ctop"><span class="xo-nm"><span class="xo-ic xo-m-bas xo-ink"></span>Bass</span><span class="xo-lvl">1.1</span></div><div class="xo-bar"><span style="width:25%; background:var(--gal-bass);"></span></div><p class="xo-grade">~ Initial stage</p></div>'
    +       '<div class="xo-card"><div class="xo-ctop"><span class="xo-nm"><span class="xo-ic xo-m-uke xo-ink"></span>Ukulele</span><span class="xo-lvl">1.3</span></div><div class="xo-bar"><span style="width:70%; background:var(--note-Fs);"></span></div><p class="xo-grade">~ Grade 1 standard</p></div>'
    +     '</div>'
    +     '<p class="xo-foot">Spend XP to open new branches on the Skills tree</p>'
    +   '</div>'
    + '</div>';

  function wire(){
    var t=document.getElementById('xpToggle'), p=document.getElementById('xo-pop');
    if(t&&p){
      t.addEventListener('click', function(e){ e.stopPropagation(); p.classList.toggle('open'); });
      document.addEventListener('click', function(e){ if(p.classList.contains('open') && !p.contains(e.target) && !t.contains(e.target)) p.classList.remove('open'); });
    }
    var track=document.getElementById('xoTrack');
    if(track){
      var dots=Array.prototype.slice.call(document.querySelectorAll('.xo-dot')), n=dots.length, i=0, H=40, timer;
      function go(k){ i=(k+n)%n; track.style.transform='translateY('+(-i*H)+'px)'; dots.forEach(function(d,j){ d.classList.toggle('active', j===i); }); }
      function reset(){ clearInterval(timer); timer=setInterval(function(){ go(i+1); }, 5000); }
      dots.forEach(function(d){ d.addEventListener('click', function(e){ e.stopPropagation(); go(parseInt(d.getAttribute('data-i'),10)); reset(); }); });
      reset();
    }
    setTimeout(function(){
      var plus=document.getElementById('xpxPlus'), num=document.getElementById('xpxNum');
      if(!plus||!num) return;
      plus.classList.add('t-gold');
      plus.classList.add('show');
      setTimeout(function(){
        var start=1240,end=1255,t0=null;
        function step(ts){ if(!t0)t0=ts; var pr=Math.min((ts-t0)/700,1); var v=Math.round(start+(end-start)*pr); num.textContent=v.toLocaleString()+' XP'; if(pr<1) requestAnimationFrame(step); else plus.classList.remove('show'); }
        requestAnimationFrame(step);
      }, 800);
    }, 1600);
  }

  function init(){
    if(!document.getElementById('tom-xp-css')){
      var l=document.createElement('link'); l.id='tom-xp-css'; l.rel='stylesheet'; l.href='tom-xp.css'; document.head.appendChild(l);
    }
    var pill=document.querySelector('.xp-pill');
    if(pill){
      pill.classList.add('xpx'); if(!pill.id) pill.id='xpToggle';
      pill.setAttribute('aria-label','2x boost, 1,255 XP, Guitar level 2.3 — open XP panel');
      pill.innerHTML=PILL_HTML;
    }
    if(!document.getElementById('xo-pop')){
      var d=document.createElement('div'); d.innerHTML=POP_HTML;
      while(d.firstChild) document.body.appendChild(d.firstChild);
    }
    wire();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
