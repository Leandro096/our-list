/** All keyframes and entrance styles for the invitation page. Plain CSS so it works from a server component. */
export function PassStyles() {
  return (
    <style>{`
      .px-root { --ink:#3b2a1f; --paper:#fdfbf7; --gold:#c9a24b; --khaki:#a8936f; --sand:#efe5d3; --night:#241810; }

      /* ---------- keyframes ---------- */
      @keyframes px-kenburns { from { transform: scale(1.04) translate3d(0,0,0); } to { transform: scale(1.2) translate3d(-2.5%,-2%,0); } }
      @keyframes px-letter { from { opacity:0; transform: translateY(.55em) rotate(7deg); filter: blur(10px); } to { opacity:1; transform:none; filter:none; } }
      @keyframes px-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes px-rise { from { opacity:0; transform: translateY(1rem); filter: blur(4px); } to { opacity:1; transform:none; filter:none; } }
      @keyframes px-cue { 0% { transform: scaleY(0); transform-origin: top; } 45% { transform: scaleY(1); transform-origin: top; } 55% { transform: scaleY(1); transform-origin: bottom; } 100% { transform: scaleY(0); transform-origin: bottom; } }
      @keyframes px-fall {
        0%   { opacity:0; transform: translate3d(0,-10vh,0) rotate(0deg); }
        10%  { opacity:.9; }
        30%  { transform: translate3d(5vw,28vh,0) rotate(110deg); }
        55%  { transform: translate3d(-4vw,58vh,0) rotate(210deg); }
        80%  { transform: translate3d(6vw,88vh,0) rotate(300deg); }
        92%  { opacity:.9; }
        100% { opacity:0; transform: translate3d(-2vw,112vh,0) rotate(380deg); }
      }
      @keyframes px-tick { from { opacity:0; transform: translateY(-40%) rotateX(65deg); } to { opacity:1; transform:none; } }
      @keyframes px-twinkle { 0%,100% { opacity:.15; transform: scale(.7); } 50% { opacity:1; transform: scale(1.2); } }
      @keyframes px-drift { from { transform: translate3d(-6%,-4%,0) scale(1); } to { transform: translate3d(8%,6%,0) scale(1.25); } }
      @keyframes px-beat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.12); } 28% { transform: scale(1); } 42% { transform: scale(1.08); } 70% { transform: scale(1); } }
      @keyframes px-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

      /* ---------- hero ---------- */
      .px-kenburns { animation: px-kenburns 26s ease-in-out infinite alternate; }
      .px-letter { display:inline-block; opacity:0; }
      .px-go .px-letter { animation: px-letter 1.1s cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(1.1s + var(--i) * 70ms); }
      .px-hero-rule { transform: scaleX(0); transform-origin: center; }
      .px-go .px-hero-rule { animation: px-rule 1.4s cubic-bezier(.6,0,.2,1) 2.3s both; }
      .px-hero-fade { opacity:0; }
      .px-go .px-hero-fade { animation: px-rise 1.2s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, 0s); }
      .px-cue::after { content:''; display:block; width:1px; height:2.5rem; background: currentColor; animation: px-cue 2.4s ease-in-out infinite; }

      /* ---------- petals ---------- */
      .px-petal { position:absolute; top:0; border-radius: 100% 0 100% 0; opacity:0; animation: px-fall linear infinite; will-change: transform; }

      /* ---------- scroll reveals ---------- */
      .px-rv { transition-delay: var(--d, 0s); }
      .px-rv[data-variant='rise'] { opacity:0; transform: translateY(1.6rem); filter: blur(5px); transition: opacity 1s ease, transform 1.1s cubic-bezier(.2,.7,.2,1), filter 1s ease; }
      .px-rv[data-variant='left'] { opacity:0; transform: translateX(-3rem); filter: blur(5px); transition: opacity 1.1s ease, transform 1.3s cubic-bezier(.2,.7,.2,1), filter 1s ease; }
      .px-rv[data-variant='right'] { opacity:0; transform: translateX(3rem); filter: blur(5px); transition: opacity 1.1s ease, transform 1.3s cubic-bezier(.2,.7,.2,1), filter 1s ease; }
      .px-rv[data-variant='zoom'] { opacity:0; transform: scale(.86); transition: opacity 1s ease, transform 1.2s cubic-bezier(.2,.9,.3,1.2); }
      .px-rv[data-variant='wipe'] { clip-path: inset(-.4em 100% -.4em -.1em); transition: clip-path 2.2s cubic-bezier(.5,0,.2,1); }
      .px-rv[data-variant='iris'] { clip-path: circle(0% at 50% 50%); transition: clip-path 1.5s cubic-bezier(.6,0,.2,1); }
      .px-rv[data-variant='curtain'] { clip-path: inset(100% 0 0 0); transition: clip-path 1.5s cubic-bezier(.7,0,.2,1); }
      .px-rv[data-variant='curtain'] img { transform: scale(1.3); transition: transform 2s cubic-bezier(.2,.7,.2,1); }
      .px-rv[data-seen='true'] { opacity:1; transform:none; filter:none; }
      .px-rv[data-variant='wipe'][data-seen='true'] { clip-path: inset(-.4em -.4em -.4em -.1em); }
      .px-rv[data-variant='iris'][data-seen='true'] { clip-path: circle(80% at 50% 50%); }
      .px-rv[data-variant='curtain'][data-seen='true'] { clip-path: inset(0 0 0 0); }
      .px-rv[data-variant='curtain'][data-seen='true'] img { transform: scale(1); }

      /* ---------- line drawing (rings, heart) ---------- */
      .px-draw * { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 2.4s cubic-bezier(.5,0,.2,1); }
      .px-draw[data-seen='true'] * { stroke-dashoffset: 0; }
      .px-draw .px-d2 { transition-delay: .5s; }
      .px-beat[data-seen='true'] { animation: px-beat 2.6s ease-in-out 2.6s infinite; }

      /* ---------- countdown ---------- */
      .px-tick { display:inline-block; animation: px-tick .6s cubic-bezier(.2,.8,.2,1) both; }
      .px-star { position:absolute; border-radius:50%; background: var(--gold); animation: px-twinkle 3.6s ease-in-out infinite; }
      .px-aurora { position:absolute; border-radius:50%; filter: blur(70px); animation: px-drift 14s ease-in-out infinite alternate; }

      /* ---------- timeline ---------- */
      .px-seg { transform-origin: top; transform: scaleY(0); transition: transform 1.4s cubic-bezier(.5,0,.2,1) .35s; }
      .px-seg[data-seen='true'] { transform: scaleY(1); }
      .px-dot { transition: background .6s ease, color .6s ease, transform .8s cubic-bezier(.3,1.6,.5,1), box-shadow .8s ease; transform: scale(.8); }
      .px-dot[data-seen='true'] { background: var(--gold); color: var(--night); transform: scale(1); box-shadow: 0 0 0 9px rgba(201,162,75,.18); }

      /* ---------- gallery parallax ---------- */
      .px-par { transform: translate3d(0, calc(var(--py, 0) * var(--amp, -36px)), 0); will-change: transform; }

      /* ---------- ticket ---------- */
      .px-ticket::before { content:''; position:absolute; inset:-1px; border-radius:inherit; padding:1px; pointer-events:none;
        background: linear-gradient(115deg, transparent 35%, rgba(201,162,75,.95) 50%, transparent 65%) 0 0 / 250% 100%;
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
        animation: px-sheen-bg 4.5s linear infinite; }
      @keyframes px-sheen-bg { from { background-position: 150% 0; } to { background-position: -100% 0; } }
      .px-step[data-seen='true'] .px-step-n { background: var(--gold); color: var(--night); }
      .px-step-n { transition: background .6s ease .3s, color .6s ease .3s; }
      .px-pill { animation: px-bob 2.4s ease-in-out infinite; }

      /* ---------- reduced motion ---------- */
      @media (prefers-reduced-motion: reduce) {
        .px-root *, .px-root *::before, .px-root *::after { animation: none !important; transition: none !important; }
        .px-rv, .px-letter, .px-hero-fade, .px-hero-rule { opacity:1 !important; transform:none !important; clip-path:none !important; filter:none !important; }
        .px-rv[data-variant='curtain'] img { transform:none !important; }
        .px-draw * { stroke-dashoffset: 0 !important; }
        .px-petal { display:none !important; }
        .px-seg { transform: none !important; }
        .px-dot { transform:none !important; }
      }
    `}</style>
  );
}
