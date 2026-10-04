/*  ITEM 10 AS BUILT , DEMO ONLY. Renders the SHIPPING frame at the three widths it is read at.
    The capture is the standard, not the DOM: SS C records that html2canvas is a different
    renderer, so a computed-style diff can be perfect while the shared image lacks the feature.  */
(function(){
  var out=document.getElementById('out'), log=[];
  function say(s,c){ log.push(c?'<span class="'+c+'">'+s+'</span>':s); out.innerHTML=log.join('\n'); }
  var V=window.VVCore;
  if(!V||!window.html2canvas||!window.DEMO_PAIRS){ say('dependencies missing','bad'); return; }
  if(V.vvInjectCardCSS) V.vvInjectCardCSS();
  if(V.vvInjectShareCSS) V.vvInjectShareCSS();
  if(window.VVMarks && VVMarks.inject) VVMarks.inject();

  var F={key:'x',name:'X',w:1200,h:675};
  var stage=document.getElementById('stage'), mount=document.getElementById('mount');

  function specOf(p){
    var win = p.winner_card_id==null ? 'tie' : (p.winner_card_id===p.a.card_id ? 'A' : 'B');
    var a=V.rowToCard(p.a), b=V.rowToCard(p.b), v=p.verdict||{};
    return {kind:'compare',a:a,b:b,winner:win,
            verdictTag:(v.tag||'the debate').replace(/_/g,' '),
            verdictLine:v.who||''};
  }
  function capture(spec,light){
    var host=document.createElement('div');
    host.innerHTML=V.vvShareFrameHTML(spec,F,light);
    stage.appendChild(host);
    var node=host.firstChild;
    var restore=[];
    try{ if(V.vvInlineMarks) restore.push(V.vvInlineMarks(node)); }catch(e){}
    try{ if(V.vvShimInsetRims) restore.push(V.vvShimInsetRims(node)); }catch(e){}
    try{ if(V.vvShimShieldNumbers) restore.push(V.vvShimShieldNumbers(node)); }catch(e){}
    return html2canvas(node,{backgroundColor:null,scale:1,width:F.w,height:F.h,logging:false})
      .then(function(cv){ return cv.toDataURL('image/png'); })
      .catch(function(e){ say('capture failed: '+e.message,'bad'); return null; })
      .then(function(url){
        restore.forEach(function(f){ try{ typeof f==='function'&&f(); }catch(e){} });
        stage.removeChild(host);
        return url;
      });
  }
  function cell(url,w,lbl){
    return '<div class="cell"><p class="lbl">'+lbl+'</p>'+
           (url?'<img src="'+url+'" style="width:'+w+'px">':'<i>failed</i>')+'</div>';
  }

  var pairs=window.DEMO_PAIRS.slice(0,2);
  var chain=Promise.resolve();
  pairs.forEach(function(p,i){
    chain=chain.then(function(){
      var sp=specOf(p);
      var marked = /<span class="sf-vem">/.test(V.vvShareFrameHTML(sp,F,false));
      var sur='';
      try{ sur=V.surnameOf((sp.winner==='A'?sp.a:sp.b).full||''); }catch(e){}
      return capture(sp,false).then(function(dark){
        return capture(sp,true).then(function(light){
          var h='<h2>Pair '+(i+1)+' , '+sp.a.full+' v '+sp.b.full+'</h2>'+
            '<p class="note">verdict line: <b>'+sp.verdictLine+'</b><br>'+
            'winner <b>'+sp.winner+'</b> ('+sur+') , emphasis '+
            (marked?'<b>marked</b>':'<b>absent, the honest fallback</b>')+'</p>'+
            '<h3>Dark , as a phone shows it (340), as X shows it (600), and the file (1200)</h3>'+
            '<div class="row">'+cell(dark,340,'340 , phone thread')+cell(dark,600,'600 , X inline')+'</div>'+
            '<div class="row">'+cell(dark,1200,'1200 , the file')+'</div>'+
            '<h3>Light</h3>'+
            '<div class="row">'+cell(light,340,'340 , phone thread')+cell(light,600,'600 , X inline')+'</div>';
          mount.insertAdjacentHTML('beforeend',h);
          window.__shots=(window.__shots||0)+2;
        });
      });
    });
  });
  chain.then(function(){
    say('captured '+(window.__shots||0)+' frames','ok');
    window.__ready=true;
  });
})();
