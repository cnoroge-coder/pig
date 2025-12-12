# API Design (v1)

Base URL: `/api/v1`
Authentication: JWT (Bearer) issued via NextAuth custom credentials or OAuth provider. Refresh optional (short-lived access token).
Content-Type: JSON. Pagination: `?page=1&pageSize=25`. Filtering: query params & future `/search` endpoints.

## Conventions
- Resource endpoints plural (`/sows`, `/boars`).
- Use 201 on creation, 204 on deletion/update without body.
- Errors: `{ "error": { "code": "BREEDING_INVALID_STATE", "message": "..." } }`.
- Idempotency for offline sync: client supplies `X-Request-Id` (UUID) -> logged for dedupe.

## Authentication & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Issue JWT |
| POST | /auth/logout | Invalidate session (optional) |
| GET | /auth/me | Current user profile |
| GET | /roles | List roles |
| POST | /roles | Create role |
| PATCH | /roles/:id | Update role permissions |

## Dashboard
| GET | /dashboard/metrics | Aggregated counts (sows, boars, expecting, litters, feed used, revenue, profit) |
| GET | /dashboard/charts/feed-growth | Feed vs growth dataset |
| GET | /dashboard/charts/mortality | Mortality trend |
| GET | /dashboard/charts/cost-sales | Month-to-month cost vs sales |

## Animals
### Sows
| GET | /sows | List with filters (breed, active, expecting=true) |
| POST | /sows | Create sow |
| GET | /sows/:id | Sow detail (weight, breeding history) |
| PATCH | /sows/:id | Update sow |
| DELETE | /sows/:id | Archive/soft delete |

### Boars
| GET | /boars | List boars |
| POST | /boars | Create boar |
| GET | /boars/:id | Detail |
| PATCH | /boars/:id | Update |
| DELETE | /boars/:id | Archive |

### Weight Records
| POST | /weights | Create (sow/boar/piglet) weight record |
| GET | /weights?refType=piglet&refId=... | Fetch series |

## Breeding
| GET | /breeding/events?sowId= | List events |
| POST | /breeding/events | Create event (HEAT/SERVE/FARROW/WEAN) |
| GET | /breeding/events/:id | Detail |
| PATCH | /breeding/events/:id | Update |
| GET | /breeding/predictions?sowId= | Derived timeline (expected farrow, wean, next heat) |

## Litters & Piglets
| GET | /litters?sowId= | List litters |
| POST | /litters | Create litter (after farrow) |
| GET | /litters/:id | Detail + piglets |
| PATCH | /litters/:id | Update outcomes |
| GET | /piglets?status=ALIVE | List piglets |
| PATCH | /piglets/:id | Update (sale, death) |
| POST | /piglets/:id/weight | Add weight record |

## Feed
| GET | /feed/types | List feed types |
| POST | /feed/types | Create feed type |
| GET | /feed/types/:id | Detail |
| PATCH | /feed/types/:id | Update |
| GET | /feed/inventory | Current stock + thresholds |
| POST | /feed/inventory/:id/movement | Adjust stock (purchase/adjustment) |
| POST | /feed/usage | Log usage (litter/group) |
| GET | /feed/usage?groupRefId= | List usage logs |
| GET | /feed/fcr?groupRefId= | Feed conversion rate |
| GET | /feed/projection?days=30 | Predicted usage next N days |

## Finance
| GET | /finance/costs?category= | List costs |
| POST | /finance/costs | Record cost |
| GET | /finance/sales | List sales |
| POST | /finance/sales | Record sale |
| GET | /finance/summary?period=month | Profit/loss aggregation |

## Health
| GET | /health/records?type=VACCINATION | List health records |
| POST | /health/records | Create record |
| GET | /health/schedule?vaccine=... | Upcoming schedule items |
| GET | /health/outbreaks | Outbreak logs |
| POST | /health/outbreaks | Log outbreak |

## Inventory
| GET | /inventory/items | List generic items |
| POST | /inventory/items | Create item |
| PATCH | /inventory/items/:id | Update |
| POST | /inventory/items/:id/movement | Movement (add/remove) |

## Notifications & Alerts
| GET | /notifications | User notifications |
| PATCH | /notifications/:id/ack | Acknowledge |
| GET | /alerts?dueBefore= | List pending alerts |
| POST | /alerts/:id/fulfill | Mark fulfilled |
| POST | /subscriptions | Add channel subscription |

## Reporting
| GET | /reports/types | Enumerate available reports |
| POST | /reports/generate | Trigger generation (async) |
| GET | /reports/:id | Retrieve metadata |
| GET | /reports/:id/download?format=pdf | Download |

## Telemetry (Future)
| POST | /rfid/read | Lookup entity by tag code |
| GET | /zones | GPS zones |

## AI (Future)
| POST | /ai/growth/predict | Predict weight trajectory |
| POST | /ai/weight/estimate | Image upload -> weight |

## Pagination & Query Params
Standard: `page`, `pageSize`, `sort=createdAt:desc`, filtering by field names. Responses shape:
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 25,
  "total": 240
}
```

## Versioning
- v1 (current) REST
- v2 potential GraphQL endpoint `/graphql` with persisted operations.

## Rate Limiting (Planned)
- Auth endpoints: 10/min/IP
- Report generation: 5/hour/user

## Webhooks (Future)
- `POST /webhooks/events` (inbound) for external triggers.
- Outbound user-defined webhooks on events: farrowScheduled, lowStock, etc.

## Error Codes Catalog (Excerpt)
| Code | Meaning |
|------|---------|
| AUTH_INVALID_CREDENTIALS | Bad login |
| ANIMAL_NOT_FOUND | Missing sow/boar/piglet |
| BREEDING_INVALID_STATE | E.g. FARROW before SERVE |
| FEED_STOCK_INSUFFICIENT | Usage exceeds inventory |
| FINANCE_CATEGORY_UNKNOWN | Bad category |
| REPORT_TYPE_UNSUPPORTED | Unknown report |
| ALERT_ALREADY_FULFILLED | Duplicate fulfill |

## Offline Sync Endpoints
- POST /sync/weights (batch)
- POST /sync/feed-usage (batch)

## Response Envelope (Single Resource Example)
```json
{
  "data": {
    "id": "clxyz...",
    "name": "Lucy",
    "breed": "Large White",
    "dateOfBirth": "2023-04-10T00:00:00.000Z",
    "expecting": true,
    "predictions": {
      "expectedFarrow": "2025-01-12T00:00:00.000Z",
      "weaning": "2025-02-05T00:00:00.000Z"
    }
  }
}
```

## Security Notes
- All write endpoints require role permissions.
- Sensitive finance endpoints logged with audit context.
- CSRF not needed for pure JWT; ensure HTTPS.

---
This spec will evolve; endpoints flagged as FUTURE will be hidden until implemented.
