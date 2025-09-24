(function(){
  const SECRET_KEY = 'bowe';
  const AUTH_SESSION_KEY = 'calc.access.authorized';
  const LOG_STORAGE_KEY = 'calc.access.logs';
  const SESSION_ID_KEY = 'calc.access.session';
  const UNKNOWN_IP = 'Desconocida';
  const MAX_LOGS = 500;

  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>Number(n).toLocaleString('es-VE',{minimumFractionDigits:4, maximumFractionDigits:4});
  const fmt2 = (n)=>Number(n).toLocaleString('es-VE',{minimumFractionDigits:2, maximumFractionDigits:2});
  function parseNum(v){ if(v==null) return NaN; const s=String(v).trim().replace(',', '.').replace(/[^\d.\-]/g,''); return s?Number(s):NaN; }
  function calcRCompraMax(m_pct, r_cobro, o_pct){ const m=m_pct/100, o=o_pct/100; const denom=1-m+o; if(denom<=0) return NaN; return r_cobro/denom; }
  function calcOpMarginPct(m_pct, r_cobro, r_compra){ const m=m_pct/100; return (r_cobro/r_compra - (1-m)) * 100; }
  function detectDeviceType(){
    const ua = navigator.userAgent || '';
    const isIpad = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if(isIpad || /tablet/i.test(ua)){ return 'tablet'; }
    if(/mobile|iphone|android|ipod/i.test(ua)){ return 'móvil'; }
    return 'escritorio';
  }
  function gatherEnvironment(){
    const languages = navigator.languages ? Array.from(navigator.languages) : (navigator.language ? [navigator.language] : []);
    const info = {
      userAgent: navigator.userAgent || 'Desconocido',
      language: navigator.language || 'Desconocido',
      languages,
      platform: navigator.platform || 'Desconocido',
      vendor: navigator.vendor || 'Desconocido',
      deviceType: detectDeviceType(),
      screenSize: (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}` : 'Desconocida',
      colorDepth: (typeof screen !== 'undefined') ? screen.colorDepth : undefined,
      timezone: (()=>{ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(_){ return 'Desconocida'; } })(),
      referrer: document.referrer || '',
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      touchPoints: navigator.maxTouchPoints || 0,
      doNotTrack: navigator.doNotTrack || null,
      viewport: (typeof window !== 'undefined') ? `${window.innerWidth}x${window.innerHeight}` : 'Desconocido'
    };
    if(navigator.connection){
      info.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    return info;
  }
  function ensureSessionId(){
    try{
      const stored = sessionStorage.getItem(SESSION_ID_KEY);
      if(stored){ return stored; }
      const generated = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
      sessionStorage.setItem(SESSION_ID_KEY, generated);
      return generated;
    }catch(_){
      return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    }
  }
  const sessionId = ensureSessionId();
  const baseInfo = Object.assign({ sessionId, url: location.href }, gatherEnvironment());
  let ipInfo = { ip: UNKNOWN_IP, source: 'pendiente' };

  const accessGate = $('accessGate');
  const accessForm = $('accessForm');
  const accessInput = $('accessKey');
  const accessMessage = $('accessMessage');
  const appMain = $('appMain');

  function loadLogs(){
    try{
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if(!stored){ return []; }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }catch(err){
      console.warn('No fue posible leer los registros de acceso.', err);
      return [];
    }
  }
  function saveLogs(logs){
    try{
      if(logs.length > MAX_LOGS){ logs.splice(0, logs.length - MAX_LOGS); }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    }catch(err){
      console.warn('No fue posible guardar el registro de acceso.', err);
    }
  }
  function logEvent(event, extra = {}){
    const entry = Object.assign({
      timestamp: new Date().toISOString(),
      event,
      ip: ipInfo.ip,
      ipDetails: Object.assign({}, ipInfo)
    }, baseInfo, extra);
    if(Array.isArray(entry.languages)){ entry.languages = entry.languages.slice(); }
    if(entry.connection){ entry.connection = Object.assign({}, entry.connection); }
    const logs = loadLogs();
    logs.push(entry);
    saveLogs(logs);
    if(typeof console !== 'undefined' && console){
      const logger = console.debug ? 'debug' : 'log';
      console[logger]('[Registro acceso]', entry);
    }
  }
  function updateStoredLogsWithIp(){
    if(!ipInfo || !ipInfo.ip || ipInfo.ip === UNKNOWN_IP){ return; }
    try{
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if(!stored){ return; }
      const logs = JSON.parse(stored);
      if(!Array.isArray(logs)){ return; }
      let modified = false;
      for(const entry of logs){
        if(entry && entry.sessionId === sessionId && (entry.ip === UNKNOWN_IP || (entry.ipDetails && entry.ipDetails.ip === UNKNOWN_IP))){
          entry.ip = ipInfo.ip;
          entry.ipDetails = Object.assign({}, ipInfo);
          modified = true;
        }
      }
      if(modified){
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
      }
    }catch(err){
      console.warn('No fue posible actualizar los registros con la IP obtenida.', err);
    }
  }
  function scheduleFocus(el){ if(el){ setTimeout(()=>{ try{ el.focus(); if(typeof el.select === 'function'){ el.select(); } }catch(_){/* noop */} }, 60); } }
  function showApp(){
    if(appMain){
      appMain.hidden = false;
      appMain.setAttribute('aria-hidden','false');
    }
    if(accessGate){
      accessGate.hidden = true;
      accessGate.setAttribute('aria-hidden','true');
    }
    if(document.body){ document.body.classList.remove('locked'); }
  }
  function showGate(){
    if(appMain){
      appMain.hidden = true;
      appMain.setAttribute('aria-hidden','true');
    }
    if(accessGate){
      accessGate.hidden = false;
      accessGate.setAttribute('aria-hidden','false');
    }
    if(accessMessage){
      accessMessage.textContent='';
      accessMessage.classList.remove('success','error');
    }
    if(document.body){ document.body.classList.add('locked'); }
    scheduleFocus(accessInput);
  }
  function initAccessControl(){
    if(!accessGate || !accessForm || !accessInput || !appMain){
      showApp();
      logEvent('access_control_error', { message: 'No se encontró la interfaz completa de control de acceso.' });
      return;
    }
    const authorized = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    if(authorized){
      showApp();
      logEvent('access_restored', { source: 'sessionStorage' });
    }else{
      showGate();
      logEvent('gate_displayed', { source: 'initial_load' });
    }
    accessForm.addEventListener('submit', (event)=>{
      event.preventDefault();
      const attemptRaw = accessInput.value;
      const attempt = attemptRaw.trim();
      const success = attempt === SECRET_KEY;
      const details = {
        keyAttempt: attempt,
        keyLength: attempt.length,
        status: success ? 'success' : 'failure',
        source: 'form'
      };
      logEvent('access_attempt', details);
      if(success){
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        showApp();
        accessForm.reset();
        if(accessMessage){
          accessMessage.textContent='Acceso concedido.';
          accessMessage.classList.remove('error');
          accessMessage.classList.add('success');
        }
        logEvent('access_granted', { keyUsed: attempt, method: 'manual' });
        setTimeout(()=>{
          if(accessMessage){
            accessMessage.textContent='';
            accessMessage.classList.remove('success');
          }
        }, 2000);
      }else{
        if(accessMessage){
          accessMessage.textContent='Clave incorrecta. Inténtalo de nuevo.';
          accessMessage.classList.remove('success');
          accessMessage.classList.add('error');
        }
        scheduleFocus(accessInput);
      }
    });
  }
  function fetchIpDetails(){
    function applyInfo(info){
      ipInfo = Object.assign({ ip: UNKNOWN_IP }, info);
      updateStoredLogsWithIp();
      if(info.source && info.source !== 'unavailable'){
        logEvent('ip_obtained', {
          provider: info.source,
          ip: ipInfo.ip,
          city: ipInfo.city || '',
          region: ipInfo.region || '',
          country: ipInfo.country || '',
          latitude: ipInfo.latitude,
          longitude: ipInfo.longitude
        });
      }
    }
    return fetch('https://ipapi.co/json/')
      .then((response)=>{
        if(!response.ok){ throw new Error('Respuesta inválida'); }
        return response.json();
      })
      .then((data)=>{
        applyInfo({
          ip: data.ip || UNKNOWN_IP,
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || data.country || '',
          latitude: data.latitude,
          longitude: data.longitude,
          postal: data.postal || '',
          org: data.org || '',
          timezone: data.timezone || '',
          source: 'ipapi.co'
        });
      })
      .catch(()=>{
        return fetch('https://api.ipify.org?format=json')
          .then((response)=>{
            if(!response.ok){ throw new Error('Respuesta inválida'); }
            return response.json();
          })
          .then((data)=>{
            applyInfo({
              ip: data.ip || UNKNOWN_IP,
              source: 'api.ipify.org'
            });
          })
          .catch((error)=>{
            console.warn('No fue posible obtener la IP del visitante.', error);
            applyInfo({ source: 'unavailable' });
          });
      })
      .finally(()=>{
        updateStoredLogsWithIp();
        logEvent('visit', { detail: 'initial_load' });
      });
  }

  fetchIpDetails();
  initAccessControl();

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
  const tabButtons = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabButtons.forEach((btn)=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.target;
      tabButtons.forEach((b)=>{
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      panels.forEach((panel)=>{
        const show = panel.id === target;
        panel.classList.toggle('active', show);
        if(show){
          panel.removeAttribute('hidden');
        }else{
          panel.setAttribute('hidden', '');
        }
      });
    });
  });
  $('btnPromedio').addEventListener('click', ()=>{
    const montoBcv=parseNum($('montoBcv').value), tasaBcv=parseNum($('tasaBcv').value);
    const montoAlt=parseNum($('montoAlt').value), tasaAlt=parseNum($('tasaAlt').value);
    const res=$('promedioResultado');
    res.classList.remove('muted','success','error');
    if(!isFinite(montoBcv)||!isFinite(tasaBcv)||!isFinite(montoAlt)||!isFinite(tasaAlt)){
      res.innerHTML='⚠️ Ingresa montos y tasas válidos para ambas operaciones.';
      res.classList.add('error');
      return;
    }
    if(montoBcv<0||montoAlt<0){
      res.innerHTML='⚠️ Los montos deben ser mayores o iguales a cero.';
      res.classList.add('error');
      return;
    }
    if(tasaBcv<=0||tasaAlt<=0){
      res.innerHTML='⚠️ Las tasas deben ser mayores a cero.';
      res.classList.add('error');
      return;
    }
    const totalUsd=montoBcv+montoAlt;
    if(!(totalUsd>0)){
      res.innerHTML='⚠️ Debes registrar al menos una compra en dólares.';
      res.classList.add('error');
      return;
    }
    const totalBs=montoBcv*tasaBcv+montoAlt*tasaAlt;
    const promedio=totalBs/totalUsd;
    res.innerHTML=`Total comprado: <b>${fmt2(totalUsd)} USD</b><br>Total pagado: <b>${fmt2(totalBs)} Bs</b><br>Tasa promedio ponderada: <b>${fmt(promedio)} Bs/USD</b>`;
    res.classList.add('success');
  });
  if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./service-worker.js'); }); }
})();
