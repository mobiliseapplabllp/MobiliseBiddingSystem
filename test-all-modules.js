const http = require('http');
const API = 'http://localhost:3001/api/v1';
function req(m,p,b,t){return new Promise((ok,ko)=>{const u=new URL(API+p);const o={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:m,headers:{'Content-Type':'application/json'}};if(t)o.headers['Authorization']='Bearer '+t;const r=http.request(o,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok({s:res.statusCode,b:JSON.parse(d)})}catch{ok({s:res.statusCode,b:d})}})});r.on('error',ko);if(b)r.write(JSON.stringify(b));r.end()})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
function ok(t,c){if(c){pass++;console.log(`  ✅ ${t}`)}else{fail++;console.log(`  ❌ ${t}`)}}

async function main(){
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  FULL MODULE FUNCTIONAL TEST                      ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // Login
  const L=await req('POST','/auth/login',{email:'admin@esourcing.com',password:'admin123'});
  const T=L.b.accessToken;
  ok('Auth: Login',!!T);
  await sleep(500);

  // Profile
  const P=await req('GET','/auth/me',null,T);
  ok('Auth: Profile',P.b.permissions?.length>0);

  // Orgs
  const O=await req('GET','/orgs',null,T);
  ok('Orgs: List',Array.isArray(O.b)&&O.b.length>0);

  // BUs
  const orgId=O.b[0]?.id;
  const BU=await req('GET','/orgs/'+orgId+'/bus',null,T);
  ok('BUs: List',Array.isArray(BU.b));

  // Users
  const U=await req('GET','/orgs/'+orgId+'/users',null,T);
  ok('Users: List',Array.isArray(U.b));

  // Roles
  const R=await req('GET','/orgs/roles/all',null,T);
  ok('Roles: List',Array.isArray(R.b)&&R.b.length>=8);

  // MDM
  const M=await req('GET','/master-data?type=CURRENCY',null,T);
  ok('MDM: Currencies',Array.isArray(M.b)&&M.b.length>0);
  const MT=await req('GET','/master-data/types',null,T);
  ok('MDM: Types',Array.isArray(MT.b)&&MT.b.length>=13);

  // Events
  await sleep(500);
  const EV=await req('POST','/rfx-events',{title:'Test RFQ',type:'RFQ',lots:[{title:'Lot 1'}]},T);
  ok('Events: Create RFQ',!!EV.b.id);
  const EVL=await req('GET','/rfx-events',null,T);
  ok('Events: List',EVL.b.meta?.total>0);
  const EVD=await req('GET','/rfx-events/'+EV.b.id,null,T);
  ok('Events: Detail',EVD.b.title==='Test RFQ');

  // Auction-type Event
  await sleep(500);
  const AE=await req('POST','/rfx-events',{title:'Auction Test',type:'REVERSE_AUCTION',auctionConfig:{auctionType:'ENGLISH',bidVisibility:'RANK_AND_PRICE',extensionEnabled:true,durationMinutes:120},lots:[{title:'Lot A'}]},T);
  ok('Events: Create Reverse Auction',AE.b.hasAuctionPhase===true);

  // Evaluations
  await sleep(500);
  const EL=await req('POST','/evaluations',{title:'Eval Test',rfxEventId:EV.b.id,envelopeType:'SINGLE',criteria:[{name:'Quality',weight:100,maxScore:10}]},T);
  ok('Evaluations: Create',!!EL.b.id);
  const ELL=await req('GET','/evaluations',null,T);
  ok('Evaluations: List',ELL.b.meta?.total>0);
  const ELS=await req('GET','/evaluations/'+EL.b.id+'/summary',null,T);
  ok('Evaluations: Summary',!!ELS.b.evaluationId);

  // Awards
  await sleep(500);
  const AW=await req('POST','/awards',{title:'Award Test',rfxEventId:EV.b.id,awardMode:'WHOLE_EVENT',items:[{supplierId:'test',supplierName:'Test Co',awardedValue:50000,status:'AWARDED'}]},T);
  ok('Awards: Create',!!AW.b.id);
  const AWL=await req('GET','/awards',null,T);
  ok('Awards: List',AWL.b.meta?.total>0);

  // Contracts
  await sleep(500);
  const CO=await req('POST','/contracts',{title:'Contract Test',contractType:'FIXED_PRICE',supplierId:'test',supplierName:'Test Co',totalValue:100000,currency:'USD',startDate:'2026-06-01',endDate:'2027-06-01'},T);
  ok('Contracts: Create',!!CO.b.id);
  const COL=await req('GET','/contracts',null,T);
  ok('Contracts: List',COL.b.meta?.total>0);
  const COS=await req('GET','/contracts/stats',null,T);
  ok('Contracts: Stats',COS.b.total>=1);

  // Supplier Portal
  await sleep(500);
  const SP=await req('GET','/supplier-portal/suppliers/approved',null,T);
  ok('Suppliers: Approved list',SP.s===200);
  const SS=await req('GET','/supplier-portal/suppliers/search',null,T);
  ok('Suppliers: Search',SS.s===200);

  // Simulate
  await sleep(500);
  const SO=await req('GET','/auth/simulate/orgs',null,T);
  ok('Simulate: List orgs',Array.isArray(SO.b)&&SO.b.length>0);

  // Security: No-auth blocks
  const NA1=await req('GET','/rfx-events');
  ok('Security: No-auth blocked on events',NA1.s===401);
  const NA2=await req('GET','/auctions');
  ok('Security: No-auth blocked on auctions',NA2.s===401);
  const NA3=await req('GET','/evaluations');
  ok('Security: No-auth blocked on evaluations',NA3.s===401);
  const NA4=await req('GET','/awards');
  ok('Security: No-auth blocked on awards',NA4.s===401);
  const NA5=await req('GET','/contracts');
  ok('Security: No-auth blocked on contracts',NA5.s===401);

  console.log('\n' + '═'.repeat(50));
  console.log(`  RESULTS: ${pass} passed, ${fail} failed (${pass+fail} total)`);
  console.log('═'.repeat(50));
}
main().catch(e=>console.error('FATAL:',e));
