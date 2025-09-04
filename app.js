(function(){
  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>Number(n).toLocaleString('es-VE',{minimumFractionDigits:4, maximumFractionDigits:4});
  function parseNum(v){ if(v==null) return NaN; const s=String(v).trim().replace(',', '.').replace(/[^\d.\-]/g,''); return s?Number(s):NaN; }
  function calcRCompraMax(m_pct, r_cobro, o_pct){ const m=m_pct/100, o=o_pct/100; const denom=1-m+o; if(denom<=0) return NaN; return r_cobro/denom; }
  function calcOpMarginPct(m_pct, r_cobro, r_compra){ const m=m_pct/100; return (r_cobro/r_compra - (1-m)) * 100; }
  $('btnCalcular').addEventListener('click', ()=>{
    const m=parseNum($('margen').value), r=parseNum($('cobro').value), o=parseNum($('operativo').value), res=$('resultado');
    res.classList.remove('muted','success','error');
    if(!isFinite(m)||!isFinite(r)||!isFinite(o)){ res.innerHTML='⚠️ Ingresa margen, tasa de cobro y margen operativo.'; res.classList.add('error'); return; }
    if(r<=0||m<0||m>=100||o<0||o>=100){ res.innerHTML='⚠️ Revisa los valores (números válidos, % entre 0–100, tasa > 0).'; res.classList.add('error'); return; }
    if(m + 1e-12 < o){ res.innerHTML=`❌ Imposible: margen bruto ${m.toFixed(2)}% < mínimo operativo ${o.toFixed(2)}%.`; res.classList.add('error'); return; }
    const rmax=calcRCompraMax(m,r,o); if(!isFinite(rmax)){ res.innerHTML='⚠️ Parámetros inválidos (1 - m + o ≤ 0).'; res.classList.add('error'); return; }
    res.innerHTML=`Tasa <b>MÁXIMA</b> de <b>COMPRA</b>: <b>${fmt(rmax)} Bs/USD</b><br>Si compras al mismo tipo que cobras (${fmt(r)}), tu margen operativo = margen bruto: ${m.toFixed(2)}%.`; res.classList.add('success');
  });
  $('btnEvaluar').addEventListener('click', ()=>{
    const m=parseNum($('margen').value), r=parseNum($('cobro').value), o=parseNum($('operativo').value), re=parseNum($('eval').value), out=$('evalSalida');
    out.classList.remove('muted','success','error');
    if(!isFinite(m)||!isFinite(r)||!isFinite(o)){ out.innerHTML='⚠️ Completa los parámetros iniciales antes de evaluar.'; out.classList.add('error'); return; }
    if(!isFinite(re)||re<=0){ out.innerHTML='⚠️ Ingresa una tasa de compra válida.'; out.classList.add('error'); return; }
    const op=calcOpMarginPct(m,r,re); const cumple=(op+1e-9>=o);
    out.innerHTML=`Con compra a <b>${fmt(re)}</b>, margen operativo: <b>${op.toFixed(2)}%</b><br>${cumple?'✅ CUMPLE':'➡️ NO cumple'} el mínimo requerido de ${o.toFixed(2)}%.`; out.classList.add(cumple?'success':'error');
  });
  if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./service-worker.js'); }); }

})();
