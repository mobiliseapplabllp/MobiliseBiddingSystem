const http = require('http');
const API = 'http://localhost:3001/api/v1';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== FULL AUCTION E2E TEST ===\n');

  // 1. Login as buyer
  console.log('Step 1: Login as Buyer');
  const login = await req('POST', '/auth/login', { email: 'buyer@demo.esourcing.com', password: 'buyer123' });
  const TOKEN = login.b.accessToken;
  console.log(TOKEN ? '  OK' : '  FAIL: ' + login.b.message);
  if (!TOKEN) return;

  // 2. Create auction
  console.log('\nStep 2: Create Auction');
  const auc = await req('POST', '/auctions', {
    title: 'E2E Test: Server Hardware',
    auctionType: 'ENGLISH', currency: 'USD',
    startAt: '2026-03-01T00:00:00Z', endAt: '2026-12-31T23:59:59Z',
    reservePrice: 5000, startingPrice: 100000,
    decrementMin: 200, decrementMax: 20000,
    extensionMinutes: 5, extensionTriggerMinutes: 5, maxExtensions: 3,
    bidVisibility: 'RANK_AND_PRICE',
    lots: [{ title: 'Rack Servers', lineItems: [{ description: 'Dell R750xs', quantity: 10, uom: 'EA' }] }]
  }, TOKEN);
  const AUC_ID = auc.b?.id;
  console.log(AUC_ID ? '  OK: ' + auc.b.refNumber : '  FAIL: ' + JSON.stringify(auc.b?.message).substring(0, 80));
  if (!AUC_ID) return;

  // 3. Get supplier org (use admin token for org list)
  const adminLogin = await req('POST', '/auth/login', { email: 'admin@esourcing.com', password: 'admin123' });
  await sleep(1200);
  const orgs = await req('GET', '/orgs', null, adminLogin.b.accessToken);
  const supOrg = (orgs.b || []).find(o => o.supplierType === true);
  if (!supOrg) { console.log('  No supplier org'); return; }
  console.log('  Supplier org: ' + supOrg.name + ' (' + supOrg.id + ')');

  // 4. Publish + Open
  console.log('\nStep 3: Publish + Open');
  await req('PATCH', '/auctions/' + AUC_ID + '/status', { status: 'PUBLISHED' }, TOKEN);
  const op = await req('PATCH', '/auctions/' + AUC_ID + '/status', { status: 'OPEN' }, TOKEN);
  console.log('  ' + (op.b.status === 'OPEN' ? 'OK: OPEN' : 'FAIL: ' + op.b.message));

  // 5. Invite supplier
  console.log('\nStep 4: Invite Supplier');
  const inv = await req('POST', '/auctions/' + AUC_ID + '/invitations', {
    supplierId: supOrg.id, supplierEmail: 'ahmed@acme-supplies.com', supplierName: 'Acme Supplies'
  }, TOKEN);
  const INV_TOKEN = inv.b?.token;
  console.log(INV_TOKEN ? '  OK: token=' + INV_TOKEN.substring(0, 8) + '...' : '  FAIL: ' + inv.b?.message);
  if (!INV_TOKEN) return;

  // 6. Supplier live view
  console.log('\nStep 5: Supplier Live View (before bids)');
  const lv1 = await req('GET', '/auction-bids/live?token=' + INV_TOKEN);
  console.log('  Status: ' + lv1.b.status + ' | Rank: ' + lv1.b.myRank + ' | Bids: ' + lv1.b.myBidCount);

  // 7. Place bids
  console.log('\nStep 6: Place Bids');
  for (const [price, n] of [[85000, 1], [80000, 2], [75000, 3]]) {
    await sleep(100);
    const bid = await req('POST', '/auction-bids/place', { bidPrice: price, invitationToken: INV_TOKEN });
    console.log(bid.b?.id ? '  Bid ' + n + ': $' + price.toLocaleString() + ' rank=#' + bid.b.rank : '  FAIL: ' + bid.b?.message);
  }

  // 8. Validation rules
  console.log('\nStep 7: Bid Validation Rules');
  const v1 = await req('POST', '/auction-bids/place', { bidPrice: 80000, invitationToken: INV_TOKEN });
  console.log('  Non-improving: ' + (v1.s === 400 ? 'BLOCKED' : 'FAIL'));
  const v2 = await req('POST', '/auction-bids/place', { bidPrice: 74900, invitationToken: INV_TOKEN });
  console.log('  Decrement<200: ' + (v2.s === 400 ? 'BLOCKED' : 'FAIL'));
  const v3 = await req('POST', '/auction-bids/place', { bidPrice: 1, invitationToken: 'bad-token' });
  console.log('  Invalid token: ' + (v3.s === 404 ? 'BLOCKED' : 'FAIL'));

  // 9. Supplier view after bids
  console.log('\nStep 8: Supplier View After Bids');
  const lv2 = await req('GET', '/auction-bids/live?token=' + INV_TOKEN);
  console.log('  Rank: #' + lv2.b.myRank + ' | Best: $' + Number(lv2.b.myBestPrice).toLocaleString() + ' | Bids: ' + lv2.b.myBidCount);

  // 10. Proxy bid
  console.log('\nStep 9: Proxy Bid');
  const px = await req('POST', '/auction-bids/proxy', { minPrice: 60000, decrementStep: 1000, invitationToken: INV_TOKEN });
  console.log(px.b?.id ? '  Set: min=$60K step=$1K' : '  FAIL: ' + px.b?.message);
  const pxg = await req('GET', '/auction-bids/proxy?token=' + INV_TOKEN);
  console.log('  Active: ' + pxg.b?.isActive + ' | AutoBids: ' + pxg.b?.totalBidsPlaced);

  // 11. Buyer ranking
  console.log('\nStep 10: Buyer Ranking');
  const rk = await req('GET', '/auctions/' + AUC_ID + '/ranking', null, TOKEN);
  (rk.b || []).forEach(r => console.log('  #' + r.rank + ' $' + Number(r.bestPrice).toLocaleString() + ' (' + r.bidCount + ' bids)'));

  // 12. Buyer live
  const bl = await req('GET', '/auctions/' + AUC_ID + '/live', null, TOKEN);
  console.log('  Live: bids=' + bl.b.totalBids + ' suppliers=' + bl.b.participatingSuppliers + ' best=$' + Number(bl.b.bestPrice).toLocaleString());

  // 13. Export
  console.log('\nStep 11: Export');
  const ex = await req('GET', '/auctions/' + AUC_ID + '/export', null, TOKEN);
  console.log(ex.b?.auction ? '  JSON: ' + ex.b.auction.totalBids + ' bids' : '  FAIL');
  const cs = await req('GET', '/auctions/' + AUC_ID + '/export/csv', null, TOKEN);
  console.log(cs.b?.csv ? '  CSV: ' + cs.b.filename : '  FAIL');

  // 14. Close
  console.log('\nStep 12: Close Auction');
  const cl = await req('PATCH', '/auctions/' + AUC_ID + '/status', { status: 'CLOSED' }, TOKEN);
  console.log('  ' + (cl.b.status === 'CLOSED' ? 'OK: CLOSED' : 'FAIL'));

  // 15. Final state
  const lv3 = await req('GET', '/auction-bids/live?token=' + INV_TOKEN);
  console.log('  Final: status=' + lv3.b.status + ' rank=#' + lv3.b.myRank);

  // 16. Variant state
  console.log('\nStep 13: Variant State');
  const vs = await req('GET', '/auctions/' + AUC_ID + '/variant-state', null, TOKEN);
  console.log('  Type: ' + vs.b?.type + ' | State: ' + (vs.b?.state ? 'present' : 'null'));

  console.log('\n=== E2E TEST COMPLETE ===');
}
main().catch(console.error);
