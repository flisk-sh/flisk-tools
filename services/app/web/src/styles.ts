// The look of the DevEx Roadmap (roadmap.flisk.si) and cmd.flisk.sh: Satoshi and JetBrains Mono, near-black with one
// green accent, a periodic-table "Lab" of tiles, pill tabs. Dark is the default; the theme button switches to light
// and remembers it. Group colors arrive as --c on each element.
export const STYLE = `
:root{color-scheme:dark;--bg:#08080c;--bg-glow:rgba(34,197,94,.07);--surface:#111117;--surface-2:#17171f;--surface-3:#1e1e28;--text:#ececf1;--muted:rgba(236,236,241,.7);--faint:rgba(236,236,241,.48);--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.2);--grid:rgba(255,255,255,.05);--accent:#22c55e;--accent-ink:#04120a;--accent-text:#6ee7a0;--accent-tint:rgba(34,197,94,.12);--shadow:0 18px 50px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.4);--font-body:"Satoshi","DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--font-mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;--maxw:92rem}
:root[data-theme=light]{color-scheme:light;--bg:#f6f6f4;--bg-glow:rgba(34,197,94,.08);--surface:#fff;--surface-2:#f0f0ed;--surface-3:#e7e7e3;--text:#16161a;--muted:#52525b;--faint:#71717a;--line:rgba(0,0,0,.09);--line-strong:rgba(0,0,0,.22);--grid:rgba(0,0,0,.06);--accent-text:#15803d;--accent-tint:rgba(34,197,94,.1);--shadow:0 18px 50px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.08)}
@media (prefers-color-scheme:light){:root:not([data-theme=dark]){color-scheme:light;--bg:#f6f6f4;--bg-glow:rgba(34,197,94,.08);--surface:#fff;--surface-2:#f0f0ed;--surface-3:#e7e7e3;--text:#16161a;--muted:#52525b;--faint:#71717a;--line:rgba(0,0,0,.09);--line-strong:rgba(0,0,0,.22);--grid:rgba(0,0,0,.06);--accent-text:#15803d;--accent-tint:rgba(34,197,94,.1);--shadow:0 18px 50px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.08)}}
*,*::before,*::after{box-sizing:border-box}[hidden]{display:none!important}
body{margin:0;background:radial-gradient(60rem 30rem at 85% -10%,var(--bg-glow),transparent 70%),radial-gradient(40rem 24rem at -10% 20%,rgba(14,165,233,.05),transparent 70%),var(--bg);color:var(--text);font-family:var(--font-body);font-size:.9375rem;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--accent-text);text-underline-offset:3px}code,pre{font-family:var(--font-mono)}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 1.25rem}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:var(--accent);color:var(--accent-ink);padding:.4rem .8rem;border-radius:8px;z-index:50}
.site-header{border-bottom:1px solid var(--line)}.bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:3rem}
.brand{display:inline-flex;align-items:center;gap:.5rem;color:var(--text);font-weight:700;text-decoration:none;white-space:nowrap}.brand img{width:20px;height:20px}
.hook{flex:1;font-family:var(--font-mono);font-size:.72rem;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
.nav{display:flex;align-items:center;gap:1rem;font-size:.875rem}.nav a{color:var(--muted);text-decoration:none;font-weight:500}.nav a:hover{color:var(--text)}
#gh-slot{display:inline-flex;gap:.5rem;align-items:center}
.gh-btn,.theme-toggle{font:inherit;font-size:.8125rem;font-weight:600;color:var(--text)!important;background:transparent;border:1px solid var(--line-strong);border-radius:999px;padding:.2rem .8rem;cursor:pointer;text-decoration:none!important}
.gh-btn:hover,.theme-toggle:hover{background:var(--surface-2)}#gh-slot a.gh-btn:first-child:not([href^="https://github.com"]){background:var(--accent);color:var(--accent-ink)!important;border-color:transparent}
@media(max-width:900px){.hook{display:none}}@media(max-width:560px){.nav-extra{display:none}}
.views{display:flex;gap:.4rem;padding:.7rem 0 0;flex-wrap:wrap}
.view-tab,.subtab{display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);text-decoration:none;font-weight:600;font-size:.875rem;padding:.35rem .9rem;border-radius:999px;border:1px solid transparent}
.view-tab:hover,.subtab:hover{color:var(--text);background:var(--surface-2)}
.view-tab[aria-current=page]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.subtabs{display:flex;gap:.4rem;flex-wrap:wrap;margin:.9rem 0 .2rem}.subtab{border-color:var(--line);font-weight:500;padding:.22rem .75rem;font-size:.8125rem}.subtab small{font-family:var(--font-mono);font-size:.7rem;color:var(--faint)}
.subtab[aria-current=page]{background:var(--surface-3);color:var(--text);border-color:var(--line-strong)}
.hero{padding:2.2rem 0 .6rem}.eyebrow{font-family:var(--font-mono);font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-text);margin:0 0 .6rem}
h1{font-size:clamp(1.9rem,4.2vw,3rem);line-height:1.05;letter-spacing:-.035em;font-weight:900;margin:0 0 .7rem;max-width:22ch}h1 em{font-style:normal;color:var(--accent-text)}
.lede{color:var(--muted);font-size:clamp(1rem,1.6vw,1.1rem);max-width:60ch;margin:0 0 1.2rem}
h2{font-size:1.25rem;letter-spacing:-.02em;margin:2rem 0 .6rem;font-weight:800}
.search{display:flex;gap:.5rem;max-width:40rem;padding:.35rem;border-radius:999px;background:var(--surface);border:1px solid var(--line-strong)}
.search input{flex:1;min-width:0;font:inherit;padding:.5rem 1rem;border:0;background:transparent;color:var(--text);outline:none}
button,.cta{font:inherit;font-weight:700;cursor:pointer;border:0;border-radius:999px;padding:.5rem 1.2rem;background:var(--accent);color:var(--accent-ink);text-decoration:none;display:inline-block}
button:hover,.cta:hover{filter:brightness(1.08)}button:disabled{opacity:.6;cursor:not-allowed}.cta.alt{background:transparent;color:var(--text);border:1px solid var(--line-strong)}
.count{font-family:var(--font-mono);font-size:.78rem;color:var(--faint);margin:1.2rem 0 .2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:.8rem;margin:.8rem 0 0;padding:0;list-style:none}
.card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem;transition:border-color .15s,transform .15s,box-shadow .15s}
.card:hover,.card:focus-within{border-color:color-mix(in srgb,var(--c) 60%,transparent);transform:translateY(-2px);box-shadow:0 10px 30px color-mix(in srgb,var(--c) 18%,transparent)}
.card .top{display:flex;align-items:center;gap:.6rem}.sym{flex:none;width:2.4rem;height:2.4rem;border-radius:10px;display:grid;place-items:center;font-weight:900;letter-spacing:-.03em;color:var(--text);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 28%,var(--surface-2)),color-mix(in srgb,var(--c) 10%,var(--surface)));border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}
.card h3{margin:0;font-size:1rem;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card h3 a{color:var(--text);text-decoration:none}.card h3 a::after{content:"";position:absolute;inset:0}
.card p{margin:0;color:var(--muted);font-size:.875rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.meta{margin-top:auto;padding-top:.3rem;font-family:var(--font-mono);font-size:.7rem;color:var(--faint);display:flex;gap:.8rem;flex-wrap:wrap}.meta .g{color:var(--c)}.meta .by{color:var(--accent-text)}
.pager{display:flex;justify-content:space-between;align-items:center;margin:1.6rem 0 0;color:var(--muted);font-size:.875rem;font-family:var(--font-mono)}
.lab{display:flex;flex-wrap:wrap;gap:1.4rem 1.6rem;--tile:72px;margin-top:1.2rem}@media(max-width:720px){.lab{--tile:64px}}
.lab-block{max-width:100%}.lab-block h3{display:flex;align-items:baseline;gap:.5rem;margin:0 0 .45rem;font-size:.85rem;color:var(--c)}.lab-block h3 small{font-family:var(--font-mono);font-size:.68rem;color:var(--faint);font-weight:400}
.lab-grid{display:grid;grid-auto-flow:column;grid-template-rows:repeat(6,var(--tile));grid-auto-columns:var(--tile);gap:4px}@media(max-width:720px){.lab-block{overflow-x:auto}}
.tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;text-decoration:none;color:var(--text);background:linear-gradient(160deg,color-mix(in srgb,var(--c) 26%,var(--surface-2)),color-mix(in srgb,var(--c) 10%,var(--surface)));border:1px solid color-mix(in srgb,var(--c) 45%,transparent);transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s;animation:tile-in .5s cubic-bezier(.2,.8,.2,1) var(--d,0ms) both}
@keyframes tile-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.tile{animation:none}.card{transition:none}}
.tile:hover,.tile:focus-visible{transform:scale(1.18);z-index:5;outline:none;box-shadow:0 0 0 2px var(--c),0 10px 30px color-mix(in srgb,var(--c) 40%,transparent)}
.t-n,.t-lic{position:absolute;top:4px;font-family:var(--font-mono);font-size:9px;color:var(--muted);line-height:1}.t-n{left:5px}.t-lic{right:5px}
.t-sym{font-size:calc(var(--tile)*.36);font-weight:900;letter-spacing:-.03em;line-height:1;margin-top:6px}.t-sym.s3{font-size:calc(var(--tile)*.29)}
.t-name{font-size:9px;color:var(--muted);max-width:92%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.legend{font-family:var(--font-mono);font-size:.72rem;color:var(--faint);margin:.4rem 0 0}
.detail{display:grid;grid-template-columns:auto 1fr;gap:1.4rem;align-items:center;padding:2rem 0 .5rem}.detail .sym{width:5.5rem;height:5.5rem;border-radius:18px;font-size:2.2rem}@media(max-width:560px){.detail{grid-template-columns:1fr}}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:.45rem 1.6rem;margin:1.4rem 0;padding:1rem 1.2rem;background:var(--surface);border:1px solid var(--line);border-radius:16px;max-width:36rem}.facts dt{margin:0;font-weight:400;color:var(--faint);font-size:.8rem;font-family:var(--font-mono)}.facts dd{margin:0}
pre{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.9rem 1rem;overflow-x:auto;font-size:.8rem;white-space:pre-wrap;word-break:break-all}
.prose{padding:2.2rem 0 0;max-width:46rem}.prose h1{max-width:none}dt{font-weight:700;margin-top:1.1rem}dd{margin:.3rem 0 0;color:var(--muted)}
.steps{counter-reset:s;list-style:none;padding:0;margin:1.2rem 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.8rem}
.steps li{counter-increment:s;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1rem;font-size:.9rem}.steps li::before{content:counter(s);display:block;font:900 1.6rem/1 var(--font-mono);color:var(--accent-text);margin-bottom:.4rem}
#pub{display:flex;flex-direction:column;gap:.9rem;padding:1.2rem;background:var(--surface);border:1px solid var(--line);border-radius:16px}
#pub label{display:flex;flex-direction:column;gap:.3rem;font-weight:600;font-size:.85rem;color:var(--muted)}#pub input,#pub select,#pub textarea{font:inherit;padding:.55rem .75rem;border-radius:10px;border:1px solid var(--line-strong);background:var(--bg);color:var(--text)}
.mcp{color:var(--accent-text)!important;font-weight:700}.tag{display:inline-block;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.06em;padding:.1rem .5rem;border-radius:999px;border:1px solid var(--line-strong);vertical-align:middle}.tag.mcp{border-color:var(--accent);background:var(--accent-tint)}
.own-mcp{margin:.8rem 0 0}.own-mcp code{color:var(--accent-text)}
:root{--adopt:#22c55e;--trial:#38bdf8;--assess:#f59e0b;--hold:#f43f5e}:root[data-theme=light]{--adopt:#16a34a;--trial:#0284c7;--assess:#d97706;--hold:#e11d48}
.chart{margin:1.2rem 0 0;max-width:46rem}.chart svg{width:100%;height:auto;display:block;background:var(--surface);border:1px solid var(--line);border-radius:16px}
.gl{stroke:var(--grid);stroke-width:1}.at{fill:var(--faint);font:10px var(--font-mono)}.al{fill:var(--muted);font:600 12px var(--font-body)}.q{fill:var(--faint);font:600 11px var(--font-mono)}
.dot circle{stroke:var(--bg);stroke-width:1;opacity:.92;transition:r .12s}.dot:hover circle,.dot:focus circle{r:9;opacity:1;stroke:var(--text)}
.rg{fill:none;stroke-width:1.5}.rg.r-adopt{stroke:var(--adopt);fill:color-mix(in srgb,var(--adopt) 6%,transparent)}.rg.r-trial{stroke:var(--trial);fill:color-mix(in srgb,var(--trial) 5%,transparent)}.rg.r-assess{stroke:var(--assess);fill:color-mix(in srgb,var(--assess) 4%,transparent)}.rg.r-hold{stroke:var(--hold);fill:color-mix(in srgb,var(--hold) 4%,transparent)}
.rl{font:700 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase}.rl.r-adopt{fill:var(--adopt)}.rl.r-trial{fill:var(--trial)}.rl.r-assess{fill:var(--assess)}.rl.r-hold{fill:var(--hold)}.fl{font:700 12px var(--font-body)}
.legend2{display:flex;gap:.4rem 1rem;flex-wrap:wrap;list-style:none;padding:0;margin:.8rem 0;font-size:.8rem;color:var(--muted)}.legend2 li{display:flex;gap:.4rem;align-items:center}.sw{width:.7rem;height:.7rem;border-radius:50%;display:inline-block}
.rings{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:.8rem;margin-top:1rem}.ringbox{background:var(--surface);border:1px solid var(--line);border-top:3px solid var(--rc);border-radius:14px;padding:.9rem 1rem}.ringbox.r-adopt{--rc:var(--adopt)}.ringbox.r-trial{--rc:var(--trial)}.ringbox.r-assess{--rc:var(--assess)}.ringbox.r-hold{--rc:var(--hold)}.ringbox h3{margin:0 0 .2rem;color:var(--rc)}.ringbox small{font-family:var(--font-mono);color:var(--faint)}
.chiplist{display:flex;flex-wrap:wrap;gap:.35rem;margin:.4rem 0}.chip2{font-size:.78rem;text-decoration:none;color:var(--text);border:1px solid color-mix(in srgb,var(--c,var(--accent)) 45%,transparent);background:color-mix(in srgb,var(--c,var(--accent)) 10%,transparent);border-radius:999px;padding:.12rem .6rem}.chip2:hover{background:color-mix(in srgb,var(--c,var(--accent)) 28%,transparent)}.chip2.main{font-weight:700}
.metro{list-style:none;margin:1.4rem 0 0;padding:0;position:relative}.metro::before{content:"";position:absolute;left:1.05rem;top:.6rem;bottom:.6rem;width:3px;background:linear-gradient(var(--accent),var(--trial),var(--assess));border-radius:2px}
.metro li{display:flex;gap:1.1rem;padding:0 0 1.6rem}.station{flex:none;z-index:1;width:2.2rem;height:2.2rem;border-radius:50%;display:grid;place-items:center;font:800 .95rem var(--font-mono);background:var(--bg);border:3px solid var(--accent);color:var(--accent-text)}
.stop{min-width:0}.stop h3{margin:0 0 .2rem;font-size:1.1rem}.stop p{margin:.25rem 0}.tip{color:var(--accent-text);font-weight:600;font-size:.9rem}.flisk-soon{opacity:.7}
details{margin-top:.4rem}summary{cursor:pointer;color:var(--accent-text);font-size:.85rem;font-weight:600}
.tablewrap{overflow-x:auto;margin-top:1.2rem}.compare{border-collapse:collapse;min-width:100%;font-size:.85rem}.compare th,.compare td{padding:.45rem .8rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.compare thead th{position:sticky;top:0;background:var(--bg)}.compare tbody th{color:var(--muted);font-weight:500;white-space:nowrap}.compare .sec th{padding-top:1.2rem;color:var(--text);font-weight:800}
.pass{color:var(--adopt);font-weight:800}.no{color:var(--faint)}.rk{font-weight:800}.rk.r-adopt{color:var(--adopt)}.rk.r-trial{color:var(--trial)}.rk.r-assess{color:var(--assess)}.rk.r-hold{color:var(--hold)}
.views{overflow-x:auto;flex-wrap:nowrap}.view-tab{white-space:nowrap}
.pf-bar{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}.pf-bar input{font:inherit;padding:.4rem .7rem;border-radius:999px;border:1px solid var(--line-strong);background:var(--surface);color:var(--text);margin-left:.4rem}
.result{margin:1.4rem 0}.pf-grid{display:grid;grid-template-columns:minmax(16rem,24rem) 1fr;gap:1.6rem;align-items:start}@media(max-width:760px){.pf-grid{grid-template-columns:1fr}}
.spider{width:100%;height:auto}.spider-ring{fill:none;stroke:var(--grid);stroke-width:1}.spider-shape{fill:color-mix(in srgb,var(--accent) 28%,transparent);stroke:var(--accent);stroke-width:2}.sl{fill:var(--muted);font:600 10px var(--font-body)}
.fits{list-style:none;padding:0;margin:0;display:grid;gap:.8rem}.fit-top{display:flex;justify-content:space-between;gap:1rem}.bar{height:.5rem;background:var(--surface-3);border-radius:999px;overflow:hidden;margin:.3rem 0}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--trial))}
.rates{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.8rem}.rate{font:inherit;font-size:.82rem;font-weight:500;cursor:pointer;color:var(--text);padding:.25rem .8rem;border-radius:999px;border:1px solid var(--line-strong);background:var(--surface)}
.rate[data-level="1"]{background:color-mix(in srgb,var(--c) 14%,var(--surface));border-color:color-mix(in srgb,var(--c) 45%,transparent)}.rate[data-level="2"]{background:color-mix(in srgb,var(--c) 34%,var(--surface));border-color:var(--c);font-weight:700}.rate[data-level="3"]{background:var(--c);color:#0b0b10;border-color:var(--c);font-weight:800}
.share{margin-top:1.4rem;padding:1rem 1.2rem;background:var(--surface);border:1px solid var(--line);border-radius:16px}.share h3{margin:0 0 .6rem}
.flabel{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);align-self:center;margin:0 .2rem 0 .6rem}.filters{align-items:center}
.jumps{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:1rem 0 0}.jump-role{--c:var(--trial)}.jump-journey{--c:var(--assess)}.jump-compare{--c:var(--accent)}
.empty{background:var(--surface);border:1px dashed var(--line-strong);border-radius:14px;padding:1rem 1.3rem;max-width:40rem;margin-top:1rem}.empty ul{margin:.4rem 0 0;padding-left:1.2rem;color:var(--muted)}
#rate{display:flex;flex-direction:column;gap:1.2rem}#rate fieldset{border:1px solid var(--line);border-radius:14px;padding:1rem 1.2rem;background:var(--surface)}#rate legend{font-weight:700;padding:0 .4rem}
.scale{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.scale label{display:inline-flex}.scale input{position:absolute;opacity:0}.scale label span{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;border:1px solid var(--line-strong);cursor:pointer;font-weight:700}.scale input:checked+span{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.scale input:focus-visible+span{outline:2px solid var(--accent-text);outline-offset:2px}
#rate textarea{font:inherit;padding:.6rem .8rem;border-radius:10px;border:1px solid var(--line-strong);background:var(--bg);color:var(--text);width:100%}
.facetbox{margin:.6rem 0 0}.facetbox summary{display:inline-block}
.start{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.7rem;margin:1.2rem 0 .4rem}.start a{display:flex;flex-direction:column;gap:.2rem;text-decoration:none;color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:.8rem 1rem}.start a:hover{border-color:var(--accent)}.start small{color:var(--muted);font-size:.8rem}
.meta .rk{font-weight:800}
.callout{display:flex;flex-direction:column;gap:.25rem;margin-top:1rem;max-width:40rem;padding:.7rem 1rem;border:1px solid var(--accent);border-radius:12px;background:var(--accent-tint)}.callout code{font-size:.8rem;word-break:break-all;color:var(--accent-text)}.callout small{color:var(--muted)}
.start a.on{border-color:var(--accent);background:var(--accent-tint)}
.verdict{margin:.4rem 0 0;padding-left:1.1rem;display:grid;gap:.25rem}.proof{color:var(--adopt)!important;font-size:.8rem!important;font-weight:600}.legend-rings{margin-top:.8rem}
.jump-compare{--c:var(--accent);font-weight:700;padding:.3rem .9rem!important;background:color-mix(in srgb,var(--accent) 22%,transparent)!important}
.card h3 .src{display:block;font:400 .68rem var(--font-mono);color:var(--faint);overflow:hidden;text-overflow:ellipsis}
.verdict-line{margin:.6rem 0;padding:.6rem .9rem;border-left:3px solid var(--accent);background:var(--accent-tint);border-radius:0 10px 10px 0}
.note{font-family:var(--font-mono);font-size:.74rem;color:var(--faint)}
footer{margin-top:4rem;border-top:1px solid var(--line);padding:1.4rem 0 2.4rem;color:var(--faint);font-size:.8125rem}
`;
