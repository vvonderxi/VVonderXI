/*  ITEM 10 DEMO , THREE OPTIONS FOR THE SAVED VERDICT IMAGE. DEMO ONLY, NOTHING SHIPS.
    ════════════════════════════════════════════════════════════════════════════════════
    Lucas's problem in one line: "the cards are the platform and the verdict beside them is
    plain sans that could be any app."

    WHAT THE CURRENT FRAME ACTUALLY DOES, read from vv-core rather than assumed:
      .sf-verdict is Inter (the .sf base family) at SH_TYPE.verdict = 0.052 of the short side,
      and it renders vvStripMarkers(verdictLine) , so the emphasis is DELIBERATELY REMOVED.
      The scores are .sf-score in Barlow Condensed at 26*S with surnames at 12*S either side
      of a "/" at 0.45 opacity, which is a caption, not a scoreline.

    THREE THINGS THIS DEMO WILL NOT FAKE:
      1. `who` CARRIES NO ** MARKERS. Measured over the whole cache. It is deliberate ,
         compare.html:831 neutralises emphasis in .vwho because a 30px/800 headline already
         IS the emphasis. So "edges it" is marked BY HAND here, and the report costs the
         three ways to make it real.
      2. NO DARK WASH. SS C ruled 2026-09-16 that emphasis takes a wash in LIGHT and stays
         ink-only in DARK, and that there is no dark wash token and must not be one.
      3. NO INSET SHADOW anywhere. html2canvas drops it on rounded elements, which is how
         the Generational rim went missing from captures. Plates use a real background and
         a real 1px border.
*/
(function(){
  var out=document.getElementById('out'), log=[];
  function say(s,c){ log.push(c?'<span class="'+c+'">'+s+'</span>':s); out.innerHTML=log.join('\n'); }
  var V=window.VVCore;
  if(!V){ say('VVCore did not load , nothing below is valid.','bad'); return; }
  if(!window.html2canvas){ say('html2canvas did not load , nothing below is valid.','bad'); return; }
  if(!window.DEMO_PAIRS || !DEMO_PAIRS.length){ say('demo_pairs.js missing','bad'); return; }

  if(V.vvInjectCardCSS) V.vvInjectCardCSS();
  if(V.vvInjectShareCSS) V.vvInjectShareCSS();
  if(window.VVMarks && VVMarks.inject) VVMarks.inject();

  var F_X   = { key:'x',   w:1200, h:675  };
  var F_IGF = { key:'igf', w:1080, h:1350 };
  var HANDLE = V.VV_HANDLE_X || '@vvonderxi';

  // ── demo-only styles. Nothing here is proposed as final CSS; it is the shape to judge. ──
  var st=document.createElement('style');
  st.textContent=[
    '.d-em{color:#E8B84B;font-weight:600;font-style:normal}',
    '.d-em-l{color:#5C4008;background:rgba(197,154,42,.20);border-radius:3px;padding:.02em .16em;margin:0 -.16em}',
    '.d-say{font-family:"Fraunces","Bricolage Grotesque",Georgia,serif;font-weight:600;line-height:1.3;letter-spacing:-.005em;text-wrap:balance}',
    '.d-num{font-family:"Barlow Condensed",Impact,sans-serif;font-weight:800;line-height:.86;font-variant-numeric:tabular-nums}',
    '.d-to{font-family:"Archivo",sans-serif;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.42}',
    '.d-nm{font-family:"Archivo",sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase}',
    '.d-by{display:inline-flex;align-items:center;font-family:"Archivo",sans-serif;font-weight:800;',
    '      letter-spacing:.11em;text-transform:uppercase;border-radius:999px;',
    '      background:linear-gradient(90deg,#F0D27A,#E0A93A);color:#5a4410}',
    '.d-handles{position:absolute;display:flex;align-items:center;font-family:"Archivo",sans-serif;font-weight:600;letter-spacing:.05em}',
    '.d-handles svg{display:block}',
    '.d-plate{position:relative}',
    '.d-rule{height:1px;opacity:.22;background:currentColor}'
  ].join('\n');
  document.head.appendChild(st);

  /*  Self-contained <path> icons. NO <use> and NO webfont: html2canvas serialises an inline
      svg to a standalone data: URI with every fetch blocked, so a <use> reference draws
      nothing and a webfont falls back. Plain paths are what the support sweep records as KEPT. */
  function icoX(px,c){ return '<svg width="'+px+'" height="'+px+'" viewBox="0 0 24 24" fill="'+c+'">'+
    '<path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.5l-5.1-6.7L5.8 22H2.7l7.6-8.7L1.2 2h6.7l4.6 6.1L18.9 2zm-1.1 18h1.7L7.3 3.8H5.4L17.8 20z"/></svg>'; }
  function icoIG(px,c){ return '<svg width="'+px+'" height="'+px+'" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2.1">'+
    '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4.1"/>'+
    '<circle cx="17.3" cy="6.7" r="1.15" fill="'+c+'" stroke="none"/></svg>'; }

  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m];}); }
  function em(s,light){ return esc(s).replace(/\*\*([^*]+)\*\*/g,function(_,t){
    return '<span class="d-em'+(light?' d-em-l':'')+'">'+t+'</span>'; }); }
  function markPhrase(s,p){ if(!s||!p) return s; var i=String(s).toLowerCase().indexOf(p.toLowerCase());
    return i<0?s:s.slice(0,i)+'**'+s.slice(i,i+p.length)+'**'+s.slice(i+p.length); }

  /*  HANDLES , bottom right, small, quiet, and DELIBERATELY the opposite corner from the
      wordmark, which .sf-brand pins top right. SS D records the bottom of igf/igs is already
      at 94% of usable width, so on igf these sit at the SIDE padding and the clearance is
      measured in the report rather than eyeballed.  */
  function handles(F,light){
    var S=Math.min(F.w,F.h)/1000, px=Math.round(Math.min(F.w,F.h)*0.021);
    var c=light?'#6b6357':'#a49c90', pad=Math.round(Math.min(F.w,F.h)*0.055);
    return '<div class="d-handles" id="dh" style="right:'+pad+'px;bottom:'+Math.round(pad*0.62)+'px;'+
      'font-size:'+Math.round(px*0.84)+'px;color:'+c+';opacity:.5;gap:'+(6*S)+'px">'+
      icoX(px,c)+'<span style="margin-right:'+(10*S)+'px">'+HANDLE+'</span>'+
      icoIG(px,c)+'<span>'+HANDLE+'</span></div>';
  }

  /*  THE SCORELINE. A caption makes the reader do arithmetic; the chip says the margin out
      loud. AND THE WINNER IS NOT THE HIGHER NUMBER ON THIS VERY PAIR , Ibrahimovic 93 beats
      Suarez 94 on the age tiebreaker , which is why the chip names the MARGIN and never the
      victor, and why the winner is carried by colour and by the tag above his card, exactly
      as shCmpFrame already decided.  */
  function scoreline(F,sp,light,big){
    var S=Math.min(F.w,F.h)/1000;
    var emph=light?'#AD0332':'#F1688E', quiet=light?'#6b6357':'#a49c90';
    var gap=Math.abs((+sp.a.vv||0)-(+sp.b.vv||0));
    function side(nm,v,win){
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:'+(9*S)+'px;min-width:'+(128*S)+'px">'+
        '<span class="d-num" style="font-size:'+(big*S)+'px;color:'+(win?emph:'inherit')+';'+(win?'':'opacity:.55')+'">'+esc(v)+'</span>'+
        '<span class="d-nm" style="font-size:'+(12.5*S)+'px;color:'+(win?'inherit':quiet)+'">'+esc(String(nm).toUpperCase())+'</span></div>';
    }
    var sn=function(f){ return V.surnameOf ? V.surnameOf(f) : String(f||'').split(' ').pop(); };
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:'+(15*S)+'px">'+
      '<div style="display:flex;align-items:flex-start;justify-content:center">'+
        side(sn(sp.a.full), sp.a.vv, sp.winner==='A')+
        '<div style="display:flex;align-items:center;height:'+(big*S*0.86)+'px;padding:0 '+(4*S)+'px">'+
          '<span class="d-to" style="font-size:'+(13*S)+'px">to</span></div>'+
        side(sn(sp.b.full), sp.b.vv, sp.winner==='B')+
      '</div>'+
      '<div class="d-by" style="font-size:'+(11.5*S)+'px;padding:'+(6*S)+'px '+(15*S)+'px">'+
        (gap===0?'LEVEL':'BY '+gap+(gap===1?' POINT':' POINTS'))+'</div></div>';
  }

  // ── THE THREE OPTIONS ────────────────────────────────────────────────────────────────
  function blockA(F,sp,light){          // A , THE STATEMENT. The panel's voice at image scale.
    var S=Math.min(F.w,F.h)/1000, wide=F.w/F.h>1.2;
    return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:'+(24*S)+'px;'+
      'position:relative;z-index:1;max-width:'+Math.round(wide?F.w*0.42:F.w*0.80)+'px">'+
      '<div class="d-say" style="font-size:'+Math.round(Math.min(F.w,F.h)*0.060)+'px">'+em(sp.said,light)+'</div>'+
      '<div class="d-rule" style="width:'+(72*S)+'px"></div>'+
      scoreline(F,sp,light,52)+'</div>';
  }
  function blockB(F,sp,light){          // B , SCORELINE HERO. The number leads, the line follows.
    var S=Math.min(F.w,F.h)/1000, wide=F.w/F.h>1.2;
    return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:'+(22*S)+'px;'+
      'position:relative;z-index:1;max-width:'+Math.round(wide?F.w*0.42:F.w*0.80)+'px">'+
      scoreline(F,sp,light,88)+
      '<div class="d-say" style="font-size:'+Math.round(Math.min(F.w,F.h)*0.042)+'px;opacity:.96">'+em(sp.said,light)+'</div></div>';
  }
  function blockC(F,sp,light){          // C , THE PLATE. The verdict gets its own ground.
    var S=Math.min(F.w,F.h)/1000, wide=F.w/F.h>1.2;
    var plate = light
      ? 'background:linear-gradient(180deg,rgba(255,255,255,.66),rgba(255,255,255,0));border:1px solid rgba(0,0,0,.07)'
      : 'background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0));border:1px solid rgba(255,255,255,.075)';
    return '<div class="d-plate" style="'+plate+';border-radius:'+(16*S)+'px;padding:'+(32*S)+'px '+(28*S)+'px '+(26*S)+'px;'+
      'display:flex;flex-direction:column;align-items:center;text-align:center;gap:'+(20*S)+'px;'+
      'position:relative;z-index:1;max-width:'+Math.round(wide?F.w*0.44:F.w*0.84)+'px">'+
      '<div class="d-say" style="font-size:'+Math.round(Math.min(F.w,F.h)*0.054)+'px">'+em(sp.said,light)+'</div>'+
      '<div class="d-rule" style="width:100%"></div>'+
      scoreline(F,sp,light,48)+'</div>';
  }

  /*  THE FRAME. Chrome and cards are the platform's; only `block` is the proposal.
      `.sf`, `.sf-brand`, `.sf-capwrap`, `.sf-slot`, `.sf-vtag` all come from VV_SHARE_CSS. */
  function frame(F,sp,light,blockFn,withHandles){
    var P=Math.round(Math.min(F.w,F.h)*0.055), S=Math.min(F.w,F.h)/1000, wide=F.w/F.h>1.2;
    var cw=Math.round(Math.min((F.h-P*(wide?2.2:4.6))/1.518, F.w*(wide?0.215:0.33)));
    var brandPx=Math.round(Math.min(F.w,F.h)*0.044), capPx=Math.round(Math.min(F.w,F.h)*0.046);
    function slot(which,side){
      var win=sp.winner===side, card=which==='a'?sp.cardA:sp.cardB;
      return '<div class="sf-slot" style="width:'+cw+'px;gap:'+(9*S)+'px">'+
        '<div class="sf-vtag'+(win?'':' sf-vtag-ghost')+'" style="font-size:'+(14*S)+'px;padding:'+(7*S)+'px '+(17*S)+'px">'+
          esc(win?(sp.tag||''):'')+'</div>'+
        '<div class="sf-slotcard'+(win?' sf-win':'')+'" style="padding:'+(6*S)+'px;border-width:'+(3*S)+'px;border-radius:'+Math.round(cw*0.09)+'px">'+
        V.buildCard(card,cw)+'</div></div>';
    }
    var pair='<div style="display:flex;gap:'+(34*S)+'px;position:relative;z-index:1;align-items:flex-start">'+slot('a','A')+slot('b','B')+'</div>';
    var block=blockFn(F,sp,light);
    var inner = wide
      ? '<div style="flex:none">'+pair+'</div><div style="flex:1;min-width:0;display:flex;justify-content:center">'+block+'</div>'
      : pair+block;
    // wordmark top right, the way .sf-brand is pinned on the real frame
    var brand='<div class="sf-brand" style="right:'+P+'px;top:'+Math.round(P*0.72)+'px;font-size:'+brandPx+'px">'+
      '<span>V</span><span style="font-size:'+Math.round(brandPx*0.68)+'px;letter-spacing:.2em">ONDERXI</span></div>';
    return '<div class="sf'+(light?' light':'')+'" style="width:'+F.w+'px;height:'+F.h+'px;'+
      (wide?'align-items:center;padding:'+P+'px '+(P*1.4)+'px;gap:'+(P*1.2)+'px'
           :'flex-direction:column;align-items:center;justify-content:center;padding:'+P+'px;gap:'+(28*S)+'px')+'">'+
      brand + inner + (withHandles?handles(F,light):'') + '</div>';
  }

  // ── build the specs from the REAL cached verdicts ────────────────────────────────────
  function specFor(p, phrase){
    var cardA=V.rowToCard(p.a), cardB=V.rowToCard(p.b);
    var win = p.winner_card_id===p.a.card_id?'A' : p.winner_card_id===p.b.card_id?'B' : 'tie';
    var tagName = p.verdict && p.verdict.tag ? String(p.verdict.tag).replace(/_/g,' ') : '';
    if(V.verdictShareName && tagName) tagName = V.verdictShareName(p.verdict.tag) || tagName;
    return { a:cardA, b:cardB, cardA:cardA, cardB:cardB, winner:win,
             tag: tagName ? String(tagName).toUpperCase() : '',
             said: markPhrase(p.verdict.who, phrase),
             rawWho: p.verdict.who };
  }

  var P1=DEMO_PAIRS[0], P2=DEMO_PAIRS[1];
  var SP1=specFor(P1,'edges it');
  var SP2=specFor(P2,'decide it');

  var stage=document.getElementById('stage'), mount=document.getElementById('mount');

  function capture(html,F){
    var box=document.createElement('div');
    box.style.cssText='width:'+F.w+'px;height:'+F.h+'px';
    box.innerHTML=html; stage.appendChild(box);
    return html2canvas(box.firstChild,{backgroundColor:null,scale:1,width:F.w,height:F.h,logging:false,useCORS:true})
      .then(function(cv){ stage.removeChild(box); return cv; });
  }

  function cell(title,cv,w){
    var d=document.createElement('div'); d.className='cell';
    d.innerHTML='<p class="lbl">'+title+'</p>';
    var img=new Image(); img.src=cv.toDataURL('image/png'); img.style.width=w+'px';
    d.appendChild(img); return d;
  }

  /*  THE FONT CONTROL. The only way to tell Fraunces from its fallback in a CAPTURE is to
      draw the same string twice, once in Fraunces and once forced to Georgia/serif, and
      compare the INK in the PNG. Identical ink means Fraunces did not apply and every
      "Fraunces" claim on this page is false.  */
  function fontControl(){
    /*  THE REGIONS ARE READ OFF THE DOM, NOT GUESSED , THE FIRST VERSION OF THIS CONTROL
        WAS VOID AND SAID SO. It split the canvas at a hardcoded x=470 and sampled 470..900
        for the serif string, which lies entirely LEFT of that line: the serif region came
        back with ZERO lit pixels and the check still reported "distinct face: YES", because
        4065 against 0 passes a difference test. A control that compares real ink against an
        EMPTY region cannot fail in the direction that matters. Each span's own rect now
        defines its window, and a lit-pixel floor makes an empty sample a FAILURE rather
        than a pass.  */
    var W=980,H=150;
    var html='<div style="width:'+W+'px;height:'+H+'px;background:#12100e;color:#F5EFE6;position:relative">'+
      '<span id="fa" style="position:absolute;left:30px;top:44px;font-family:\'Fraunces\',Georgia,serif;font-weight:600;font-size:44px;white-space:nowrap">edges it</span>'+
      '<span id="fb" style="position:absolute;left:520px;top:44px;font-family:Georgia,serif;font-weight:600;font-size:44px;white-space:nowrap">edges it</span></div>';
    var box=document.createElement('div'); box.style.cssText='width:'+W+'px;height:'+H+'px';
    box.innerHTML=html; stage.appendChild(box);
    var host=box.firstChild.getBoundingClientRect();
    var ra=box.querySelector('#fa').getBoundingClientRect();
    var rb=box.querySelector('#fb').getBoundingClientRect();
    var A={x0:Math.floor(ra.left-host.left)-4, x1:Math.ceil(ra.right-host.left)+4, w:ra.width};
    var B={x0:Math.floor(rb.left-host.left)-4, x1:Math.ceil(rb.right-host.left)+4, w:rb.width};
    return html2canvas(box.firstChild,{backgroundColor:null,scale:1,width:W,height:H,logging:false})
      .then(function(cv){
        stage.removeChild(box);
        var ctx=cv.getContext('2d');
        function ink(R){
          var w=R.x1-R.x0, d=ctx.getImageData(R.x0,0,w,H).data, minX=1e9,maxX=-1,n=0;
          for(var y=0;y<H;y++) for(var x=0;x<w;x++){
            var i=(y*w+x)*4;
            if(d[i]>110&&d[i+1]>100){ n++; if(x<minX)minX=x; if(x>maxX)maxX=x; } }
          return {px:n, span:(maxX<0?0:maxX-minX), x0:R.x0, x1:R.x1};
        }
        return {domA:A.w, domB:B.w, inkA:ink(A), inkB:ink(B), cv:cv};
      });
  }

  // ── run ──────────────────────────────────────────────────────────────────────────────
  var OPTIONS=[['A , STATEMENT',blockA],['B , SCORELINE HERO',blockB],['C , PLATE',blockC]];

  /*  FORCE THE FACE TO LOAD BEFORE MEASURING. `document.fonts.ready` resolves when the fonts
      IN USE have settled, and at that moment nothing on this page is using Fraunces yet, so
      check() answered false on a page that had it available. Loading it explicitly is the
      difference between "not requested" and "not available", which is the distinction the
      whole font control exists to make.  */
  Promise.all([document.fonts.load('600 44px Fraunces'), document.fonts.load('600 60px Fraunces')])
    .then(function(){ return document.fonts.ready; }).then(function(){
    say('Fraunces available after an explicit load: '+document.fonts.check('600 44px Fraunces'),
        document.fonts.check('600 44px Fraunces')?'ok':'bad');

    var jobs=[];
    // the three options on the Suarez v Ibrahimovic pair, both themes, X format
    [false,true].forEach(function(light){
      OPTIONS.forEach(function(o){
        jobs.push({title:o[0]+' , '+(light?'LIGHT':'DARK'), F:F_X, sp:SP1, fn:o[1], handles:true, group:light?'light':'dark'});
      });
    });
    // one option on the second real pair, to show it survives different content
    jobs.push({title:'A , STATEMENT , second real pair (Suarez v Messi) , DARK', F:F_X, sp:SP2, fn:blockA, handles:true, group:'second'});
    // igf, because SS D says the bottom of igf is at 94% of usable width and handles go there
    jobs.push({title:'A , STATEMENT , INSTAGRAM FEED 1080x1350 , DARK', F:F_IGF, sp:SP1, fn:blockA, handles:true, group:'igf'});

    var groups={};
    function section(name,title){
      if(groups[name]) return groups[name];
      var h=document.createElement('h3'); h.textContent=title; mount.appendChild(h);
      var r=document.createElement('div'); r.className='row'; mount.appendChild(r);
      groups[name]=r; return r;
    }

    var seq=Promise.resolve();
    jobs.forEach(function(j){
      seq=seq.then(function(){
        var html=frame(j.F,j.sp,j.group==='light',j.fn,j.handles);
        return capture(html,j.F).then(function(cv){
          var r=section(j.group, j.group==='dark'?'The three options , DARK, 1200x675'
                              : j.group==='light'?'The three options , LIGHT, 1200x675'
                              : j.group==='second'?'Different content, same option'
                              : 'Instagram feed format, where the bottom is tightest');
          r.appendChild(cell(j.title+' , full (520px)',cv,520));
          r.appendChild(cell(j.title+' , <span style="color:#E0A93A">thumbnail 300px</span>',cv,300));
          say('captured '+j.title+'  '+cv.width+'x'+cv.height);
        });
      });
    });

    seq.then(fontControl).then(function(f){
      say('\n── FONT CONTROL , can the CAPTURE draw Fraunces? ──');
      say('  sampled windows  Fraunces x'+f.inkA.x0+'..'+f.inkA.x1+'   serif x'+f.inkB.x0+'..'+f.inkB.x1);
      say('  DOM width        Fraunces '+f.domA.toFixed(1)+'px   forced serif '+f.domB.toFixed(1)+'px');
      say('  PNG lit pixels   Fraunces '+f.inkA.px+'   serif '+f.inkB.px);
      say('  PNG ink span     Fraunces '+f.inkA.span+'px   serif '+f.inkB.span+'px');
      /*  BOTH SAMPLES MUST CONTAIN INK BEFORE ANY DIFFERENCE MEANS ANYTHING. */
      var bothLit = f.inkA.px>300 && f.inkB.px>300;
      var domDiff = Math.abs(f.domA-f.domB)>1.5;
      var pngDiff = Math.abs(f.inkA.span-f.inkB.span)>4;
      say('  both windows contain ink    : '+(bothLit?'YES':'NO , the control is VOID'), bothLit?'ok':'bad');
      say('  page resolved Fraunces      : '+(domDiff?'YES':'NO'), domDiff?'ok':'bad');
      say('  CAPTURE drew a distinct face: '+(!bothLit?'UNKNOWN':(pngDiff?'YES':'NO , html2canvas fell back')),
          (bothLit&&pngDiff)?'ok':'bad');
      if(bothLit&&domDiff&&pngDiff) say('  => the Fraunces claim on this page is MEASURED, not asserted.','ok');
      else say('  => VOID or FAILED. Every "Fraunces" label above must be re-judged.','bad');
      say('\n── WHAT THE DATA DOES NOT CARRY ──');
      say('  stored who (pair 1): '+JSON.stringify(SP1.rawWho));
      say('  ** markers in it   : '+((String(SP1.rawWho).match(/\*\*/g)||[]).length/2)+'  <- the emphasis is HAND-MARKED in this demo','warn');
      say('  the same is true of pair 2: '+((String(SP2.rawWho).match(/\*\*/g)||[]).length/2)+' markers','warn');
      say('\n── WINNER SANITY , the case the scores cannot express ──');
      say('  pair 1: '+SP1.a.full+' '+SP1.a.vv+' vs '+SP1.b.full+' '+SP1.b.vv+'  winner='+SP1.winner+
          (String(SP1.winner==='B'?SP1.b.vv:SP1.a.vv) < String(SP1.winner==='B'?SP1.a.vv:SP1.b.vv) ? '  <- the LOWER score wins (age tiebreaker)' : ''),'warn');
    }).catch(function(e){ say('FAILED: '+(e&&e.message||e),'bad'); });
  });
})();
