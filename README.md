# 🐷 Pig Breeding & Farm Management System

A full-featured, modular farm intelligence platform for managing pig breeding cycles, animal health, feed economics, growth performance, inventory, finance, notifications, and reporting. Built to be extensible, offline-capable (PWA), and future‑ready for AI augmentation and IoT (RFID/GPS).

## ✨ Core Value
Turn raw farm events (serving, farrowing, feeding, weighing, treatments, costs, sales) into actionable insight: profitability per cycle, feed efficiency, growth trends, health risk early warnings, and operational reminders.

## 🚀 Tech Stack (Proposed)
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (App Router, TypeScript) + Tailwind CSS + React Query | Fast dev, SSR/ISR for reports, component ecosystem, good PWA support |
| Backend | NestJS (modular, TypeScript) | Clean DI, testability, domain isolation |
| Database | PostgreSQL + Prisma ORM | Relational integrity, analytics-friendly, migrations |
| Auth | NextAuth (JWT + Role claims) | Flexible providers, session/JWT hybrid |
| Messaging/Jobs | BullMQ / Redis (later) | Scheduled alerts & async processing |
| File/Assets | Local dev -> S3/MinIO later | Scalable media storage |
| Notifications | Email (SMTP), optional SMS gateway, Web push | Multi-channel alerts |
| Reports | PDFKit + ExcelJS | Server-side export (PDF/Excel) |
| Infra (future) | Docker + Kubernetes/Container Apps | Scalability path |
| AI (future) | Python microservice / edge WASM | Specialized model serving |

> Assumption: PostgreSQL accessible; Redis optional initially (alerts can be cron-based then upgraded).

## 🧱 High-Level Architecture
```
+------------------+        +------------------+        +------------------+
|  Next.js (PWA)   | <--->  |  NestJS API      | <----> |  PostgreSQL +    |
|  Pages / App Dir |  REST  |  Modules:        |  Prisma|  Redis (future)  |
|  React Query     | GraphQL|  Auth, Breeding, |        |  (jobs/cache)    |
|  Offline Cache   | (later)|  Animals, Feed,  |        |                  |
+------------------+        |  Finance, Health |        +------------------+
        |                   |  Inventory, Report|                |
        | Web Push / SW     +------------------+                |
        v                                                    AI / ML svc
  Service Worker (PWA)                                         (future)
```

## 🗂 Domain Modules (Backend)
- **Auth & Users**: Users, Roles, Permissions, API Tokens (later)
- **Animals**: Sows, Boars, Litters, Piglets, WeightRecords, BreedingEvents
- **Breeding**: Heat cycles, serving records, farrowing predictions, weaning schedules, automated alerts
- **Feed**: FeedTypes, Inventory, UsageLogs, FCR calculation, predictive needs
- **Health**: Vaccinations, DewormingEvents, MedicationRecords, OutbreakLogs
- **Finance**: Costs (by category), Sales (piglets, pork, manure), Profit/Loss aggregation
- **Inventory**: Generic stock items (meds, tools, supplies) & thresholds
- **Notifications**: Rules engine -> queue -> channel adapter (email/web/SMS)
- **Reporting**: Generators (monthly, cycle, mortality, performance) -> PDF/Excel exporters
- **Telemetry (future)**: GPS zones, RFID tags, image uploads for weight estimation

## 🐖 Key Features Coverage
- Dashboard metrics & charts
- Full lifecycle tracking per sow/boar
- Litter performance & ADG
- Feed conversion & projection
- Cost vs revenue analytics
- Health scheduling & compliance
- Breeding automation (heat, farrowing, weaning forecasts)
- Inventory low-stock alerts
- Role-based access control
- Multi-channel notifications
- PWA offline data capture
- Exportable reports (PDF/Excel)

## 🗃 Database (Conceptual ER Highlights)
Core entities (simplified):
```
User (role)
Role (name, capabilities)
Sow, Boar
BreedingEvent (sow_id, boar_id?, type=SERVE/FARROW/WEAN, dates)
Litter (sow_id, farrow_date, live_born, dead_born)
Piglet (litter_id, status, sale info)
WeightRecord (piglet_id or sow_id, date, weight)
FeedType (category, cost_per_unit)
FeedInventory (feed_type_id, qty_on_hand)
FeedUsageLog (group_ref, feed_type_id, amount_used, date)
Cost (category_id, amount, date)
CostCategory
Sale (object_type=piglet/pork/manure, ref_id, price, date)
Vaccination, DewormingEvent, MedicationRecord
HealthIssue / OutbreakLog
InventoryItem, InventoryMovement
Notification, AlertRule
ReportCache (optional)
```
Detailed schema will be in `docs/database-schema.prisma` (to be added).

## 🔐 Roles & Permissions (Initial)
- **Admin**: Full CRUD + finance edit + user mgmt
- **Manager**: All except altering roles/users, maybe restricted finance deletion
- **Worker**: Create feed usage, weight records, basic health events
- **Vet**: Health module + view animals
- **ReadOnly** (optional): View dashboards & reports

## 🔔 Example Alerts
- Sow farrowing window approaching (T-2 days)
- Piglets due for weaning tomorrow
- Feed inventory below threshold
- Vaccination due list for week
- Growth lag detection (ADG below expected)

## 📦 Scalability & Future Path
- Introduce event sourcing for breeding events if complexity grows
- Add columnar analytics (e.g., DuckDB/ClickHouse) for heavy reporting
- ML microservice for growth prediction & weight estimation
- IoT integration pipeline for RFID/GPS streaming

## 🧪 Testing Strategy
- Unit: Domain services (breeding calculations, FCR, ADG)
- Integration: Prisma-backed repositories
- E2E: Dashboard metrics aggregation
- Contract: OpenAPI schema + client generation

## 🛡 Security Considerations
- JWT role claims + route guards
- Input validation (Zod / class-validator)
- Rate limiting (Redis-based) for notification endpoints
- Audit log for finance & health changes

## 📱 PWA Features (Planned)
- Offline capture of weights & feed usage -> sync queue
- Background sync service worker
- Web push subscriptions per user + channel preferences

## 📄 Reporting (Planned Output)
- Cycle Profitability PDF
- Monthly Feed Efficiency Excel
- Mortality Trend PDF
- Year Summary Book (multi-section consolidated)

## 🔮 Future Extras (Reserved)
- AI Growth Prediction
- Image-based weight estimation
- GPS farm zone mapping
- RFID tag scanning (WebUSB/WebBluetooth or mobile app)

## 🏗 Setup (Will be refined after scaffold)
```bash
# (After scaffold) install dependencies
cd web && npm install
cd ../server && npm install
# Prisma migration
cd server && npx prisma migrate dev
# Dev
npm run dev (frontend) | npm run start:dev (backend)
```

## ✅ Next Steps
1. Finalize detailed architecture (`docs/architecture.md`)
2. Add database schema (`docs/database-schema.prisma`)
3. Scaffold Next.js + NestJS projects
4. Implement auth & role model
5. Add initial animal/breeding modules & dashboard metrics

---
Feel free to request changes to stack or architecture before deeper implementation.
