const http = require('http');
const API = 'http://localhost:3001/api/v1';
function req(m,p,b,t){return new Promise((ok,ko)=>{const u=new URL(API+p);const o={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:m,headers:{'Content-Type':'application/json'}};if(t)o.headers['Authorization']='Bearer '+t;const r=http.request(o,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok({s:res.statusCode,b:JSON.parse(d)})}catch{ok({s:res.statusCode,b:d})}})});r.on('error',ko);if(b)r.write(JSON.stringify(b));r.end()})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0,skip=0;
function ok(t,c){if(c){pass++;console.log(`  ✅ ${t}`)}else{fail++;console.log(`  ❌ ${t}`)}}
function sk(t){skip++;console.log(`  ⏭️  ${t} (skipped)`)}

async function main(){
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  eSourcing Platform v1.0.0 — FULL SYSTEM TEST            ║');
  console.log('║  50 models · 197 endpoints · 28 sprints                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ═══ 1. AUTH ═══
  console.log('── 1. Authentication ──');
  const L=await req('POST','/auth/login',{email:'admin@esourcing.com',password:'admin123'});
  const T=L.b.accessToken;
  ok('Login',!!T);
  if(!T){console.log('FATAL: Cannot login');return}

  const P=await req('GET','/auth/me',null,T);
  ok('Profile + permissions',P.b.permissions?.length>0);
  ok('Profile has locale',!!P.b.preferredLocale);

  const R=await req('POST','/auth/refresh',{refreshToken:L.b.refreshToken});
  ok('Token refresh',!!R.b.accessToken);await sleep(300);

  // ═══ 2. RBAC ═══
  console.log('\n── 2. RBAC & Security ──');
  for(const ep of['/rfx-events','/auctions','/evaluations','/awards','/contracts','/orgs','/analytics/dashboard']){
    const r=await req('GET',ep);ok(`No-auth ${ep} → 401`,r.s===401);
  }
  const fakeJwt=await req('GET','/rfx-events',null,'fake.jwt.token');
  ok('Forged JWT rejected',fakeJwt.s===401);await sleep(300);

  // ═══ 3. ORGANISATIONS ═══
  console.log('\n── 3. Organisations + BUs + Users ──');
  const O=await req('GET','/orgs',null,T);
  ok('List orgs',Array.isArray(O.b)&&O.b.length>0);
  const orgId=O.b[0]?.id;
  const BU=await req('GET','/orgs/'+orgId+'/bus',null,T);
  ok('List BUs',Array.isArray(BU.b));
  const U=await req('GET','/orgs/'+orgId+'/users',null,T);
  ok('List users',Array.isArray(U.b)&&U.b.length>0);
  const RL=await req('GET','/orgs/roles/all',null,T);
  ok('List roles',Array.isArray(RL.b)&&RL.b.length>=8);await sleep(300);

  // ═══ 4. MASTER DATA ═══
  console.log('\n── 4. Master Data ──');
  const MT=await req('GET','/master-data/types',null,T);
  ok('MDM types',Array.isArray(MT.b)&&MT.b.length>=13);
  const MC=await req('GET','/master-data?type=CURRENCY',null,T);
  ok('MDM currencies',Array.isArray(MC.b)&&MC.b.length>0);await sleep(300);

  // ═══ 5. EVENTS ═══
  console.log('\n── 5. Events (RFx) ──');
  const EV=await req('POST','/rfx-events',{title:'System Test RFQ',type:'RFQ',lots:[{title:'Test Lot'}]},T);
  ok('Create RFQ event',!!EV.b.id);
  const EVL=await req('GET','/rfx-events',null,T);
  ok('List events',EVL.b.meta?.total>0);
  const EVD=await req('GET','/rfx-events/'+EV.b.id,null,T);
  ok('Event detail',EVD.b.title==='System Test RFQ');

  // Auction-type event
  await sleep(500);
  const AE=await req('POST','/rfx-events',{title:'System Test Auction',type:'REVERSE_AUCTION',auctionConfig:{auctionType:'ENGLISH',bidVisibility:'RANK_AND_PRICE',extensionEnabled:true,durationMinutes:120},lots:[{title:'Auction Lot'}]},T);
  ok('Create Reverse Auction event',AE.b.hasAuctionPhase===true);await sleep(300);

  // ═══ 6. AUCTIONS ═══
  console.log('\n── 6. Auctions ──');
  const AL=await req('GET','/auctions',null,T);
  ok('List auctions',AL.s===200);

  // ═══ 7. EVALUATIONS ═══
  console.log('\n── 7. Evaluations ──');
  await sleep(500);
  const EL=await req('POST','/evaluations',{title:'System Test Eval',rfxEventId:EV.b.id,envelopeType:'SINGLE',criteria:[{name:'Quality',weight:100,maxScore:10}]},T);
  ok('Create evaluation',!!EL.b.id);
  const ELL=await req('GET','/evaluations',null,T);
  ok('List evaluations',ELL.b.meta?.total>0);
  if(EL.b.id){
    const ES=await req('GET','/evaluations/'+EL.b.id+'/summary',null,T);
    ok('Evaluation summary',!!ES.b.evaluationId);
    const EM=await req('GET','/evaluations/'+EL.b.id+'/matrix',null,T);
    ok('Score matrix',EM.s===200);
  }await sleep(300);

  // ═══ 8. AWARDS ═══
  console.log('\n── 8. Awards ──');
  await sleep(500);
  const AW=await req('POST','/awards',{title:'System Test Award',rfxEventId:EV.b.id,awardMode:'WHOLE_EVENT',items:[{supplierId:'test',supplierName:'Test Co',awardedValue:50000,status:'AWARDED'}]},T);
  ok('Create award',!!AW.b.id);
  const AWL=await req('GET','/awards',null,T);
  ok('List awards',AWL.b.meta?.total>0);await sleep(300);

  // ═══ 9. CONTRACTS ═══
  console.log('\n── 9. Contracts ──');
  await sleep(500);
  const CO=await req('POST','/contracts',{title:'System Test Contract',contractType:'FIXED_PRICE',supplierId:'test',supplierName:'Test Co',totalValue:100000,currency:'USD',startDate:'2026-06-01',endDate:'2027-06-01'},T);
  ok('Create contract',!!CO.b.id);
  const COL=await req('GET','/contracts',null,T);
  ok('List contracts',COL.b.meta?.total>0);
  const COS=await req('GET','/contracts/stats',null,T);
  ok('Contract stats',COS.b.total>=1);
  const COE=await req('GET','/contracts/expiring?days=365',null,T);
  ok('Expiring contracts',COE.s===200);await sleep(300);

  // ═══ 10. SUPPLIER PORTAL ═══
  console.log('\n── 10. Supplier Portal ──');
  const SP=await req('GET','/supplier-portal/suppliers/approved',null,T);
  ok('Approved suppliers',SP.s===200);
  const SS=await req('GET','/supplier-portal/suppliers/search',null,T);
  ok('Search suppliers',SS.s===200);await sleep(300);

  // ═══ 11. ANALYTICS ═══
  console.log('\n── 11. Analytics ──');
  const AD=await req('GET','/analytics/dashboard',null,T);
  ok('Dashboard widgets',AD.s===200);
  const AS=await req('GET','/analytics/spend',null,T);
  ok('Spend analytics',AS.s===200);
  const ASV=await req('GET','/analytics/savings',null,T);
  ok('Savings report',ASV.s===200);
  const AEV=await req('GET','/analytics/events',null,T);
  ok('Event activity',AEV.s===200);await sleep(300);

  // ═══ 12. REPORTS ═══
  console.log('\n── 12. Reports ──');
  await sleep(500);
  const RP=await req('POST','/reports',{title:'System Test Report',reportType:'EVENT_SUMMARY'},T);
  ok('Create report',!!RP.b.id);
  const RPL=await req('GET','/reports',null,T);
  ok('List reports',RPL.b.meta?.total>0);
  if(RP.b.id){
    const RPG=await req('POST','/reports/'+RP.b.id+'/generate',null,T);
    ok('Generate report',RPG.s===200||RPG.s===201);
  }await sleep(300);

  // ═══ 13. NOTIFICATIONS ═══
  console.log('\n── 13. Notifications ──');
  const NL=await req('GET','/notifications',null,T);
  ok('List notifications',NL.s===200);
  const NU=await req('GET','/notifications/unread-count',null,T);
  ok('Unread count',NU.s===200);
  const NP=await req('GET','/notifications/preferences',null,T);
  ok('Preferences',NP.s===200);await sleep(300);

  // ═══ 14. CURRENCY ═══
  console.log('\n── 14. Multi-Currency ──');
  const CR=await req('GET','/currency/rates',null,T);
  ok('List exchange rates',CR.s===200);
  const CC=await req('GET','/currency/convert?from=USD&to=EUR&amount=1000',null,T);
  ok('Convert currency',CC.s===200);await sleep(300);

  // ═══ 15. WORKFLOWS ═══
  console.log('\n── 15. Workflow Engine ──');
  const WL=await req('GET','/workflows/templates',null,T);
  ok('List workflow templates',WL.s===200);
  const WI=await req('GET','/workflows/instances',null,T);
  ok('List workflow instances',WI.s===200);await sleep(300);

  // ═══ 16. AUDIT ═══
  console.log('\n── 16. Audit & Compliance ──');
  const AU=await req('GET','/audit/logs',null,T);
  ok('Query audit logs',AU.s===200);
  const AC=await req('GET','/audit/compliance',null,T);
  ok('Compliance report',AC.s===200);
  const AR=await req('GET','/audit/retention',null,T);
  ok('Retention status',AR.s===200);await sleep(300);

  // ═══ 17. INTEGRATIONS ═══
  console.log('\n── 17. API & Integrations ──');
  const AK=await req('GET','/integrations/api-keys',null,T);
  ok('List API keys',AK.s===200);
  const WH=await req('GET','/integrations/webhooks',null,T);
  ok('List webhooks',WH.s===200);await sleep(300);

  // ═══ 18. PERFORMANCE ═══
  console.log('\n── 18. Performance ──');
  const PC=await req('GET','/performance/cache',null,T);
  ok('Cache stats',PC.s===200);
  const PL=await req('GET','/performance/latency',null,T);
  ok('Latency metrics',PL.s===200);await sleep(300);

  // ═══ 19. HEALTH ═══
  console.log('\n── 19. Health & System ──');
  const H=await req('GET','/health');
  ok('Health check',H.s===200);
  const HD=await req('GET','/health/detailed',null,T);
  ok('Detailed health',HD.s===200);
  const SI=await req('GET','/system/info',null,T);
  ok('System info',SI.s===200);await sleep(300);

  // ═══ 20. AI ═══
  console.log('\n── 20. AI Features ──');
  const AI=await req('GET','/ai/status',null,T);
  ok('AI status endpoint',AI.s===200);
  ok('AI enabled field present',AI.b.enabled!==undefined);

  // ═══ 21. USER PREFERENCES ═══
  console.log('\n── 21. User Preferences ──');
  const UP=await req('PATCH','/auth/preferences',{locale:'en',theme:'light'},T);
  ok('Update preferences',UP.b.updated===true);

  // ═══ 22. SIMULATE ═══
  console.log('\n── 22. Simulate/Switch ──');
  const SO=await req('GET','/auth/simulate/orgs',null,T);
  ok('Simulate orgs',Array.isArray(SO.b)&&SO.b.length>0);

  // ═══ FINAL SUMMARY ═══
  console.log('\n' + '═'.repeat(55));
  console.log(`  RESULTS: ${pass} passed · ${fail} failed · ${skip} skipped`);
  console.log(`  TOTAL: ${pass+fail+skip} tests`);
  if(fail===0)console.log('  🎉 ALL TESTS PASSED');
  else console.log(`  ⚠️  ${fail} FAILURES — review above`);
  console.log('═'.repeat(55));
}
main().catch(e=>console.error('FATAL:',e.message));
