# System Architecture

## 1. Layered Overview
```
Presentation (Next.js PWA)
  - Pages / Route Segments (App Router)
  - UI Components (Dashboard widgets, Forms, Tables)
  - State/Data (React Query, local offline cache)
  - Service Worker (offline sync + push notifications)

API Gateway / Backend (NestJS)
  - Controllers (REST endpoints; GraphQL gateway later)
  - DTO Validation (class-validator / Zod bridge)
  - Services (Domain logic per module)
  - Repositories (Prisma abstraction)
  - Background Jobs (BullMQ for scheduled alerts & reports)
  - Event Bus (In-process, upgrade to Redis pub/sub later)

Data & Persistence
  - PostgreSQL (transactional + relational integrity)
  - Prisma ORM (migrations, typed queries)
  - Redis (optional: caching, job queues, rate limiting)

Infra / Integration
  - SMTP / Email Provider (notifications)
  - SMS Gateway (optional)
  - Object Storage (S3 / MinIO for media & report exports)
  - Future: AI microservices, RFID readers, GPS devices
```

## 2. Domain Modules & Boundaries
| Module | Owns | Depends On |
|--------|------|------------|
| Auth | Users, Roles, Permissions | Notifications (for invite), Reporting (audit) |
| Animals | Sows, Boars, Litters, Piglets, WeightRecords | Breeding, Health |
| Breeding | HeatCycle calc, Serving, Farrowing, Weaning schedules | Animals, Notifications |
| Feed | FeedTypes, Inventory, UsageLogs, FCR | Animals (group references), Finance |
| Health | Vaccinations, Deworming, Medication, Outbreak | Animals, Notifications, Inventory |
| Finance | Costs, Sales, Profitability, Categories | Feed, Animals, Breeding |
| Inventory | Generic stock, Movements, Thresholds | Health, Feed |
| Notifications | Rules, Subscriptions, Sending | All modules |
| Reporting | Aggregation, Export (PDF/Excel), Caching | All modules |
| Telemetry (future) | RFID, GPS zones, Images | Animals, AI |
| AI (future) | Growth prediction, Weight estimation | Animals, Feed |

## 3. Data Flow Examples
### Breeding Alert Flow
1. Worker records serving event for a sow.
2. Breeding Service calculates expected farrowing date (+115 days) & weaning date.
3. Creates AlertRules: `FarrowWindowStart`, `WeaningDue`.
4. Scheduler scans upcoming alerts daily -> pushes to Notifications Service.
5. Notifications Service resolves user subscriptions -> sends Email/Web Push.

### Feed Conversion Tracking
1. FeedUsageLog entries linked to pig group (litter or batch).
2. WeightRecords aggregated for that group over time.
3. FCR = Total Feed Consumed (kg) / Total Weight Gain (kg).
4. Reporting Service stores snapshot for dashboard trending.

### Offline Weight Capture
1. User opens PWA offline; cached schema & UI load.
2. Weight entries queued in IndexedDB.
3. Service Worker sync event flushes queue when connection returns.
4. API deduplicates via client-generated UUID.

## 4. Scheduling & Jobs
| Job | Frequency | Purpose |
|-----|-----------|---------|
| AlertRule Scan | 1h or daily | Emit due alerts |
| Report Precompute | Daily midnight | Cache dashboard metrics |
| Feed Projection | Daily | Update predicted consumption |
| Growth Forecast (future ML) | Daily | Update predicted weights |
| Cleanup Orphans | Weekly | Remove stale temp records |

Implementation: BullMQ Queues: `alerts`, `reports`, `projections`.

## 5. Notification Channels
- **Email**: Primary reliable channel.
- **Web Push**: Real-time farm browser notifications.
- **SMS**: Critical events (farrowing imminent, outbreak) if enabled.
- Strategy: Notification entity holds: `channel[]`, `priority`, `payload`, `status (PENDING/SENT/FAILED)`.

## 6. Reporting Architecture
- ReportRequest -> generation pipeline -> optionally cached (ReportCache).
- Export Adapters:
  - PDF: PDFKit layout templates.
  - Excel: ExcelJS workbook builders.
- Chunk large queries (e.g., year summary) & stream results to builder.

## 7. Performance Considerations
- Heavy aggregations: materialized summary tables (e.g., monthly_feed_stats).
- Caching layer for dashboard metrics (Redis or Postgres LISTEN/NOTIFY triggers later).
- N+1 avoidance via Prisma relations & explicit selects.

## 8. Security & RBAC Flow
1. User login -> JWT w/ role claim & permission set (e.g., `animals.read`, `finance.write`).
2. NestJS Guard checks route metadata (RequiredPermissions[]) against claims.
3. Fine-grained record-level checks for finance edits.

## 9. Error Handling Strategy
- Domain errors -> mapped to 4xx with codes (e.g., `BREEDING_INVALID_STATE`).
- Unknown errors -> 500 + correlation ID.
- Logging: Structured JSON (winston/pino) -> future centralized log store.

## 10. Extensibility Hooks
- EventEmitter in services (e.g., `breeding.farrowScheduled`) -> listeners register additional behavior (audit, notifications, webhook dispatch).
- Plugin approach (future): modules can expose lifecycle methods (onInit, onShutdown, onEvent).

## 11. PWA Components
| Component | Role |
|-----------|------|
| `manifest.json` | App metadata & installability |
| Service Worker | Caching strategies + background sync |
| IndexedDB Store | Offline queue for feed & weight logs |
| Push Subscription | Stores endpoint & keys per user |

## 12. Future AI Integration
- Separate microservice w/ REST or gRPC.
- Model Input: Breed, Age, Historical Weights, Feed Type, FCR.
- Prediction Output: WeightProjection[], Confidence intervals.

## 13. Observability (Future)
- Metrics: request latency, job duration, alert queue depth.
- Tracing: OpenTelemetry spans across frontend fetch & backend.

## 14. Deployment Topology (Later Stage)
```
[Client Browsers] --> CDN (static Next.js assets)
     |                 |
     |             Next.js server (SSR)
     |                 |
     +------------>  API (NestJS)  ---> PostgreSQL
                           |        -> Redis (cache/queues)
                           |        -> Object Storage (reports/images)
                           +--> External services (SMTP, SMS)
```

## 15. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Large reporting queries slow | User frustration | Precompute, pagination, caching |
| Missed alerts due to job failure | Operational loss | Retry + health checks on queues |
| Offline sync conflicts | Data inconsistency | UUID + last-write-wins with audit trail |
| Rapid feature creep | Instability | Strict module boundaries & versioned API |

---
This architecture is a living document; adjustments will follow real usage feedback.
