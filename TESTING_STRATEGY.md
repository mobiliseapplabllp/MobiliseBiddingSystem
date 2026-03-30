# eSourcing Platform — Testing Strategy

## 1. Test Pyramid

```
       /  E2E Tests  \        ← 10% — Cypress/Playwright (Sprint 26+)
      /  Integration   \       ← 30% — Real DB, cross-module
     /   Unit Tests      \     ← 60% — Mocked dependencies
```

## 2. Test Tiers (per CLAUDE.md)

### Tier 1: Unit Tests (≥80% branch coverage)
- **What:** Pure business logic, no DB
- **Tools:** Jest + NestJS Test.createTestingModule()
- **Mocks:** PrismaService, EventEmitter2, AuditService, AnalyticsService, RedisService
- **Naming:** `*.spec.ts` in `__tests__/` directory alongside module
- **Run:** `npx jest --testPathPattern=spec.ts`

### Tier 2: Integration Tests (every endpoint, happy path)
- **What:** Real DB (esourcing_test), no mocks
- **Tools:** Jest + Supertest + real NestJS app
- **DB:** Separate `esourcing_test` database, `prisma migrate deploy` before run
- **Naming:** `*.integration.spec.ts`
- **Run:** `DATABASE_URL=...test npx jest --config jest.integration.config.ts`

### Tier 3: Cross-Tenant Isolation Tests (one per model)
- **What:** Verify RLS policies at DB level
- **Pattern:** Set tenant context to Org A → query → assert all records belong to Org A
- **Required for:** Every Prisma model with `orgId` field
- **Naming:** `cross-tenant.spec.ts`

## 3. Coverage Targets

| Module | Unit | Integration | Cross-Tenant |
|--------|------|-------------|-------------|
| Auth | ≥80% | login, refresh, me | N/A (platform-level) |
| Organisations | ≥80% | CRUD, BU CRUD | org, BU, user |
| RFx | ≥80% | CRUD, status transitions | rfx_events, lots, line_items |
| Invitations | ≥80% | invite, respond, revoke | supplier_invitations |
| Bids | ≥80% | create, submit, amend | bid_submissions, line_items |
| Master Data | ≥80% | list, create, update | reference_data |
| **Auctions** | ≥80% | CRUD, state machine, bidding | 6 auction tables |

## 4. Security Test Cases

### Authentication & Authorization
| # | Test Case | Expected | Severity |
|---|-----------|----------|----------|
| SEC-001 | Call protected endpoint without JWT | 401 Unauthorized | CRITICAL |
| SEC-002 | Call endpoint with expired JWT | 401 Unauthorized | CRITICAL |
| SEC-003 | Call endpoint with forged JWT (wrong secret) | 401 Unauthorized | CRITICAL |
| SEC-004 | ORG_ADMIN calls PLATFORM_ADMIN endpoint | 403 Forbidden | HIGH |
| SEC-005 | BUYER calls ORG_ADMIN endpoint | 403 Forbidden | HIGH |
| SEC-006 | Login with wrong password | 401 Unauthorized | HIGH |
| SEC-007 | Login brute force (>5 attempts/min) | 429 Too Many Requests | HIGH |
| SEC-008 | Refresh with revoked token | 401 Unauthorized | HIGH |
| SEC-009 | Refresh with expired token | 401 Unauthorized | HIGH |

### Multi-Tenancy
| # | Test Case | Expected | Severity |
|---|-----------|----------|----------|
| MT-001 | Org A queries Org B's RFx events | Empty result (RLS) | CRITICAL |
| MT-002 | Org A queries Org B's auctions | Empty result (RLS) | CRITICAL |
| MT-003 | Org A queries Org B's bids | Empty result (RLS) | CRITICAL |
| MT-004 | Org A queries Org B's invitations | Empty result (RLS) | CRITICAL |
| MT-005 | ORG_ADMIN lists orgs → sees only own org | Single org returned | CRITICAL |
| MT-006 | PLATFORM_ADMIN lists orgs → sees all | All orgs returned | LOW |
| MT-007 | BU-scoped user sees only their BU's events | BU-filtered results | HIGH |

### Auction-Specific Security
| # | Test Case | Expected | Severity |
|---|-----------|----------|----------|
| AUC-001 | Bid on non-OPEN auction | 403 Forbidden | CRITICAL |
| AUC-002 | Bid after auction close time | 403 Forbidden | CRITICAL |
| AUC-003 | Bid without valid invitation token | 404 Not Found | CRITICAL |
| AUC-004 | Bid with revoked invitation | 403 Forbidden | CRITICAL |
| AUC-005 | Bid that doesn't improve (same price) | 400 Bad Request | HIGH |
| AUC-006 | Bid that doesn't improve (higher price) | 400 Bad Request | HIGH |
| AUC-007 | Bid violating decrement minimum | 400 Bad Request | HIGH |
| AUC-008 | Bid violating decrement maximum | 400 Bad Request | HIGH |
| AUC-009 | Bid below reserve in sealed auction | 400 Bad Request | HIGH |
| AUC-010 | Invalid state transition (DRAFT→OPEN) | 400 Bad Request | HIGH |
| AUC-011 | Supplier views other supplier's bids | Own bids only | CRITICAL |
| AUC-012 | Auto-extension triggers correctly | endAt extended | MEDIUM |
| AUC-013 | Auto-extension stops at maxExtensions | endAt NOT extended | MEDIUM |
| AUC-014 | Duplicate supplier invitation | 400 Bad Request | MEDIUM |

## 5. Test Data Strategy

### Unit Tests
- Use in-memory mocks, no real data
- Factory functions for creating test entities

### Integration Tests
- Seed test data in `beforeAll` using Prisma
- Clean up in `afterAll`
- Use unique IDs per test to avoid conflicts

### Cross-Tenant Tests
- Create 2 test orgs (Org A, Org B) with data in each
- Verify isolation by switching tenant context

## 6. CI/CD Integration

```yaml
# .github/workflows/test.yml
test:
  steps:
    - npm install
    - npx prisma migrate deploy --schema=packages/prisma/schema.prisma
    - npx jest --coverage --testPathPattern=spec.ts       # Unit tests
    - npx jest --config jest.integration.config.ts         # Integration tests
    - coverage-check --threshold 80                        # Fail if < 80%
```

## 7. Test File Locations

| Test Type | Location | Pattern |
|-----------|----------|---------|
| Unit (auctions) | `apps/api/src/modules/auctions/__tests__/` | `*.spec.ts` |
| Cross-tenant | `apps/api/src/modules/auctions/__tests__/` | `cross-tenant.spec.ts` |
| Unit (auth) | `apps/api/src/modules/auth/__tests__/` | `*.spec.ts` |
| Unit (rfx) | `apps/api/src/modules/rfx/__tests__/` | `*.spec.ts` |

## 8. What We Verify on Every PR

- [ ] All unit tests pass
- [ ] ≥80% branch coverage on changed files
- [ ] Cross-tenant isolation tests pass for any new tenant-scoped table
- [ ] Audit log calls present on all write operations
- [ ] Analytics tracking calls present on all business operations
- [ ] No `any` types in new TypeScript code
- [ ] No directional CSS (ml-, pl-, left-) in new components
- [ ] All UI strings use i18n keys
