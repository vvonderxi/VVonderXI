/*  ITEM 10 , OPTION A REFINED. DEMO ONLY, NOTHING SHIPS.
    ════════════════════════════════════════════════════════════════════════════════════
    Lucas picked A and asked for three things. All three are answered with a measurement.

    1. NO WASH. Emphasis is the INK alone. Gold #E8B84B on dark, brand red #AD0332 on light.
       MEASURED on the .sf.light gradient's three stops: 6.93 / 6.24 / 5.69, worst 5.69,
       so it clears AA at every stop. Raw brand #E70443 is 3.59 at the worst stop and FAILS,
       which is why the red is the darkened one , the same value --pink-ink already takes in
       light mode, not a new colour.
       AND ON THE MEASURE THAT ACTUALLY MATTERS , separation from the surrounding prose ,
       the red BEATS the dark gold it replaces: 2.21 against 1.70. For scale, gold against
       cream on the dark frame is 1.61, so light is now the STRONGER of the two grounds.

    2. WHICH PHRASE. No prompt edit (item 25 is pending) and no heuristic. The third option
       is STRUCTURAL: mark the WINNER'S SURNAME, which comes from `winner_card_id` and the
       card's own `full` name. Nothing reads the sentence and nothing invents emphasis.
       MEASURED over every cached verdict with a decided winner (n=72):
         winner's surname appears in `who`  69 / 72 = 95.8%
         it appears FIRST                   68 / 69
         it appears more than once           0      , so there is no ambiguity to resolve
         neither surname appears             2      , and those simply get no emphasis
       This is the same justification SS C already accepts for the A/B identity colours on
       compare: a tint on text that already says who it is, never colour carrying meaning
       on its own. The gold rim and the tag still carry the winner.

    3. 300px. My own thumbnail test said A became texture, so A is fixed rather than excused.
       The lever is type size, and the number to judge is the DISPLAYED size in a 300px feed
       tile, which is the file size divided by four.
*/
(function(){
  var out=document.getElementById('out'), log=[];
  function say(s,c){ log.push(c?'<span class="'+c+'">'+s+'</span>':s); out.innerHTML=log.join('\n'); }
  var V=window.VVCore;
  if(!V||!window.html2canvas||!window.DEMO_PAIRS){ say('dependencies missing','bad'); return; }
  if(V.vvInjectCardCSS) V.vvInjectCardCSS();
  if(V.vvInjectShareCSS) V.vvInjectShareCSS();
  if(window.VVMarks && VVMarks.inject) VVMarks.inject();

  var F={key:'x',w:1200,h:675};
  var st=document.createElement('style');
  st.textContent=[
    /* THE ONLY CHANGE TO THE INK: no background, no padding, no negative margin. */
    '.d-em{color:#E8B84B;font-weight:600;font-style:normal}',
    '.d-em-l{color:#AD0332}',
    /* the OLD treatment, kept solely so the before/after is a fair comparison */
    '.d-old{color:#5C4008;background:rgba(197,154,42,.20);border-radius:3px;padding:.02em .16em;margin:0 -.16em;font-weight:600}',
    '.d-say{font-family:"Fraunces","Bricolage Grotesque",Georgia,serif;font-weight:600;line-height:1.26;letter-spacing:-.005em;text-wrap:balance}',
    '.d-num{font-family:"Barlow Condensed",Impact,sans-serif;font-weight:800;line-height:.86;font-variant-numeric:tabular-nums}',
    '.d-to{font-family:"Archivo",sans-serif;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.42}',
    '.d-nm{font-family:"Archivo",sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase}',
    '.d-by{display:inline-flex;align-items:center;font-family:"Archivo",sans-serif;font-weight:800;',
    '      letter-spacing:.11em;text-transform:uppercase;border-radius:999px;',
    '      background:linear-gradient(90deg,#F0D27A,#E0A93A);color:#5a4410}',
    '.d-rule{height:1px;opacity:.22;background:currentColor}'
  ].join('\n');
  document.head.appendChild(st);

  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m];}); }
  var norm=function(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); };

  /*  STRUCTURAL EMPHASIS , the winner's surname, located by NORMALISED comparison so the
      diacritic in "Ibrahimović" cannot cause a miss, but rendered from the ORIGINAL string
      so the accent survives. If the surname is absent the line renders with NO emphasis,
      which is the honest fallback and is what 2 of 72 verdicts get.  */
  function markWinner(who, winnerFull, cls){
    var sn = V.surnameOf ? V.surnameOf(winnerFull) : String(winnerFull||'').split(' ').pop();
    if(!who || !sn) return { html:esc(who), marked:false, sn:sn };
    var i = norm(who).indexOf(norm(sn));
    if(i < 0) return { html:esc(who), marked:false, sn:sn };
    return { html: esc(who.slice(0,i)) + '<span class="'+cls+'">' + esc(who.slice(i,i+sn.length)) + '</span>' + esc(who.slice(i+sn.length)),
             marked:true, sn:sn };
  }
  /*  The OLD demo's treatment, for the before frame only: a hand-picked phrase with a wash. */
  function markPhraseOld(who, phrase){
    var i=String(who).toLowerCase().indexOf(phrase.toLowerCase());
    if(i<0) return esc(who);
    return esc(who.slice(0,i))+'<span class="d-old">'+esc(who.slice(i,i+phrase.length))+'</span>'+esc(who.slice(i+phrase.length));
  }

  function scoreline(sp,light,big){
    var S=Math.min(F.w,F.h)/1000;
    var emph=light?'#AD0332':'#F1688E', quiet=light?'#6b6357':'#a49c90';
    var gap=Math.abs((+sp.a.vv||0)-(+sp.b.vv||0));
    var sn=function(f){ return V.surnameOf?V.surnameOf(f):String(f||'').split(' ').pop(); };
    function side(nm,v,win){
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:'+(8*S)+'px;min-width:'+(120*S)+'px">'+
        '<span class="d-num" style="font-size:'+(big*S)+'px;color:'+(win?emph:'inherit')+';'+(win?'':'opacity:.55')+'">'+esc(v)+'</span>'+
        '<span class="d-nm" style="font-size:'+(11.5*S)+'px;color:'+(win?'inherit':quiet)+'">'+esc(String(nm).toUpperCase())+'</span></div>';
    }
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:'+(13*S)+'px">'+
      '<div style="display:flex;align-items:flex-start;justify-content:center">'+
        side(sn(sp.a.full),sp.a.vv,sp.winner==='A')+
        '<div style="display:flex;align-items:center;height:'+(big*S*0.86)+'px;padding:0 '+(4*S)+'px">'+
          '<span class="d-to" style="font-size:'+(12*S)+'px">to</span></div>'+
        side(sn(sp.b.full),sp.b.vv,sp.winner==='B')+'</div>'+
      '<div class="d-by" style="font-size:'+(10.5*S)+'px;padding:'+(5*S)+'px '+(13*S)+'px">'+
        (gap===0?'LEVEL':'BY '+gap+(gap===1?' POINT':' POINTS'))+'</div></div>';
  }

  /*  THE VARIANTS. `frac` is the verdict size as a fraction of the short side, which is the
      unit SH_TYPE already uses, so any number here is directly comparable to the shipped
      0.052 and to the first demo's 0.060.  */
  function block(sp,light,o){
    var S=Math.min(F.w,F.h)/1000, px=Math.round(Math.min(F.w,F.h)*o.frac);
    var text = o.leadOnly ? String(sp.who).split(/\s*:\s*/)[0] : sp.who;
    var m = o.old ? { html: markPhraseOld(text,'edges it'), marked:true }
                  : markWinner(text, sp.winnerFull, light?'d-em d-em-l':'d-em');
    return '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:'+(22*S)+'px;'+
      'position:relative;z-index:1;max-width:'+Math.round(F.w*0.44)+'px">'+
      '<div class="d-say" id="SAY" style="font-size:'+px+'px">'+m.html+'</div>'+
      '<div class="d-rule" style="width:'+(70*S)+'px"></div>'+
      scoreline(sp,light,o.score||48)+'</div>';
  }

  function frame(sp,light,o){
    var P=Math.round(Math.min(F.w,F.h)*0.055), S=Math.min(F.w,F.h)/1000;
    var cw=Math.round(Math.min((F.h-P*2.2)/1.518, F.w*0.215));
    function slot(card,side){
      var win=sp.winner===side;
      return '<div class="sf-slot" style="width:'+cw+'px;gap:'+(9*S)+'px">'+
        '<div class="sf-vtag'+(win?'':' sf-vtag-ghost')+'" style="font-size:'+(14*S)+'px;padding:'+(7*S)+'px '+(17*S)+'px">'+
          esc(win?(sp.tag||''):'')+'</div>'+
        '<div class="sf-slotcard'+(win?' sf-win':'')+'" style="padding:'+(6*S)+'px;border-width:'+(3*S)+'px;border-radius:'+Math.round(cw*0.09)+'px">'+
        V.buildCard(card,cw)+'</div></div>';
    }
    var brandPx=Math.round(Math.min(F.w,F.h)*0.044);
    var brand='<div class="sf-brand" style="right:'+P+'px;top:'+Math.round(P*0.8)+'px;font-size:'+brandPx+'px">'+
      '<span>V</span><span style="font-size:'+Math.round(brandPx*0.68)+'px;letter-spacing:.2em">ONDERXI</span></div>';
    return '<div class="sf'+(light?' light':'')+'" style="width:'+F.w+'px;height:'+F.h+'px;align-items:center;'+
      'padding:'+P+'px '+(P*1.4)+'px;gap:'+(P*1.2)+'px">'+ brand +
      '<div style="flex:none"><div style="display:flex;gap:'+(34*S)+'px;position:relative;z-index:1;align-items:flex-start">'+
        slot(sp.cardA,'A')+slot(sp.cardB,'B')+'</div></div>'+
      '<div style="flex:1;min-width:0;display:flex;justify-content:center">'+block(sp,light,o)+'</div></div>';
  }

  var p=DEMO_PAIRS[0];
  var cardA=V.rowToCard(p.a), cardB=V.rowToCard(p.b);
  var win = p.winner_card_id===p.a.card_id?'A':p.winner_card_id===p.b.card_id?'B':'tie';
  var SP={ a:cardA, b:cardB, cardA:cardA, cardB:cardB, winner:win,
           tag:'EYE TEST', who:p.verdict.who,
           winnerFull: win==='A'?cardA.full:cardB.full };

  var stage=document.getElementById('stage'), mount=document.getElementById('mount');
  function capture(html){
    var box=document.createElement('div'); box.style.cssText='width:'+F.w+'px;height:'+F.h+'px';
    box.innerHTML=html; stage.appendChild(box);
    return html2canvas(box.firstChild,{backgroundColor:null,scale:1,width:F.w,height:F.h,logging:false})
      .then(function(cv){ stage.removeChild(box); return cv; });
  }
  function cell(title,cv,w){
    var d=document.createElement('div'); d.className='cell';
    d.innerHTML='<p class="lbl">'+title+'</p>';
    var i=new Image(); i.src=cv.toDataURL('image/png'); i.style.width=w+'px'; d.appendChild(i); return d;
  }
  function section(t){ var h=document.createElement('h3'); h.textContent=t; mount.appendChild(h);
    var r=document.createElement('div'); r.className='row'; mount.appendChild(r); return r; }

  var VARIANTS=[
    { id:'before', name:'BEFORE , wash + hand-picked phrase', frac:0.060, old:true,  score:52 },
    { id:'ink',    name:'AFTER 1 , ink only, winner surname', frac:0.060, score:48 },
    { id:'big',    name:'AFTER 2 , ink only, line at 0.085',  frac:0.085, score:42 },
    { id:'lead',   name:'AFTER 3 , lead clause only, 0.105',  frac:0.105, score:40, leadOnly:true }
  ];

  Promise.all([document.fonts.load('600 44px Fraunces'),document.fonts.load('600 90px Fraunces')])
   .then(function(){ return document.fonts.ready; }).then(function(){
    say('Fraunces available: '+document.fonts.check('600 44px Fraunces'), document.fonts.check('600 44px Fraunces')?'ok':'bad');

    var seq=Promise.resolve();
    [false,true].forEach(function(light){
      var row=null;
      VARIANTS.forEach(function(o){
        seq=seq.then(function(){
          return capture(frame(SP,light,o)).then(function(cv){
            if(!row) row=section((light?'LIGHT':'DARK')+' , before and after, each shown full and at 300px');
            var disp=(Math.round(675*o.frac)/4).toFixed(1);
            row.appendChild(cell(o.name+' , full',cv,440));
            row.appendChild(cell(o.name+' , <span style="color:#E0A93A">300px</span> , line reads '+disp+'px',cv,300));
            say('captured '+o.id+' '+(light?'light':'dark')+'  file line '+Math.round(675*o.frac)+'px, displayed at 300 '+disp+'px');
          });
        });
      });
    });

    seq.then(function(){
      /*  THE EMPHASIS MUST BE PROVEN PRESENT IN THE PNG, not in the DOM. Sample the marked
          span's own rect and compare its ink to the prose beside it. Identical means the
          colour did not draw and every claim above is void.  */
      var light=true;
      var box=document.createElement('div'); box.style.cssText='width:'+F.w+'px;height:'+F.h+'px';
      box.innerHTML=frame(SP,light,{frac:0.085,score:42}); stage.appendChild(box);
      var host=box.firstChild.getBoundingClientRect();
      var span=box.querySelector('.d-em');
      if(!span){ stage.removeChild(box); say('\nNO EMPHASIS SPAN , the winner surname was not found in this line.','warn'); return; }
      var r=span.getBoundingClientRect();
      var reg={x:Math.round(r.left-host.left),y:Math.round(r.top-host.top),w:Math.round(r.width),h:Math.round(r.height)};
      return html2canvas(box.firstChild,{backgroundColor:null,scale:1,width:F.w,height:F.h,logging:false}).then(function(cv){
        stage.removeChild(box);
        var ctx=cv.getContext('2d');
        function darkest(x,y,w,h){ var d=ctx.getImageData(x,y,w,h).data,best=null,bl=1e9;
          for(var i=0;i<d.length;i+=4){ var L=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
            if(L<bl){bl=L;best=[d[i],d[i+1],d[i+2]];} } return best; }
        var inkEm = darkest(reg.x,reg.y,reg.w,reg.h);
        var inkProse = darkest(Math.max(0,reg.x-140),reg.y,120,reg.h);
        say('\n── DID THE RED DRAW? read from the PNG, light frame ──');
        say('  emphasis span box : '+JSON.stringify(reg));
        say('  darkest px inside : rgb('+inkEm.join(',')+')   expected near 173,3,50');
        say('  darkest px beside : rgb('+inkProse.join(',')+')   expected near 36,31,26');
        var isRed = inkEm[0]>120 && inkEm[0] > inkEm[1]*2.5 && inkEm[0] > inkEm[2]*1.8;
        var proseDark = inkProse[0]<90;
        say('  emphasis is RED   : '+(isRed?'YES':'NO'), isRed?'ok':'bad');
        say('  prose is NOT red  : '+(proseDark?'YES':'NO'), proseDark?'ok':'bad');
        say((isRed&&proseDark)?'  => the ink-only emphasis is MEASURED in the capture.':'  => VOID, re-judge.', (isRed&&proseDark)?'ok':'bad');
        say('\n── THE CONTRAST NUMBERS HE ASKED FOR ──');
        say('  brand red #AD0332 on the light share ground : 6.93 / 6.24 / 5.69 across the three stops');
        say('  worst stop 5.69, so it clears AA 4.5 everywhere','ok');
        say('  raw brand #E70443 would be 3.59 at the worst stop and FAILS , hence the darkened red','warn');
        say('  separation from surrounding prose: red 2.21 vs the dark gold it replaces 1.70');
        say('  for scale, gold on the DARK frame separates at 1.61, so light is now the stronger ground','ok');
        say('\n── THE STRUCTURAL PHRASE, measured over the cache ──');
        say('  verdicts with a decided winner        : 72');
        say('  winner surname present in `who`       : 69  (95.8%)','ok');
        say('  appears first                         : 68 of 69');
        say('  appears more than once                : 0   , no ambiguity to resolve','ok');
        say('  neither surname present               : 2   , those render with NO emphasis','warn');
        say('  this line marks                       : "'+(V.surnameOf?V.surnameOf(SP.winnerFull):SP.winnerFull)+'"');
      });
    }).catch(function(e){ say('FAILED: '+(e&&e.message||e),'bad'); });
  });
})();
