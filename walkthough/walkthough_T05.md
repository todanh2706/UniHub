# T05 Walkthrough - Khoi tao Project va Du lieu mau

## Muc tieu T05

- Setup base code cho Backend va Database (Docker compose voi PostgreSQL + Redis).
- Tao du lieu mau seed cho he thong.
- Tao script generate CSV gia lap.
- Cap nhat README huong dan chay project.

## Nhung gi da hoan thanh

## 1) Full Docker demo stack

- Cap nhat `src/docker-compose.yml`:
  - Them `postgres` (co healthcheck).
  - Them `redis` (co password + healthcheck).
  - Them `backend` (build tu `src/backend/Dockerfile`, depends_on postgres/redis healthy).
  - Backend expose `8080` va healthcheck qua `/actuator/health`.

## 2) Dockerfile cho backend

- Them `src/backend/Dockerfile`:
  - Build app bang Maven tren Java 25.
  - Tao runtime image Java 25 JRE.
  - Chay jar `backend-0.0.1-SNAPSHOT.jar`.

## 3) Backend config va dependencies phuc vu T05

- Cap nhat `src/backend/pom.xml`:
  - Them `spring-boot-starter-web`.
  - Them `spring-boot-starter-actuator`.
  - Them `spring-boot-starter-data-redis`.
  - Flyway da duoc giu lai de quan ly schema migration.

- Cap nhat `src/backend/src/main/resources/application.yaml`:
  - Cau hinh datasource qua env vars.
  - Cau hinh Redis qua env vars.
  - Bat Flyway.
  - `ddl-auto: validate`.
  - Bat health endpoint: `/actuator/health`.

## 4) Flyway migration day du

- Rewrite baseline migration:
  - `src/backend/src/main/resources/db/migration/V1__init_schema.sql`
  - Tao day du schema theo database design.
  - Tao index quan trong va partial unique index `uq_active_registration`.

- Seed migration:
  - `src/backend/src/main/resources/db/migration/V2__seed_demo_data.sql`
  - Seed du lieu demo xuyen suot domain:
    - RBAC (roles, permissions, user_roles, role_permissions)
    - users + students
    - events, rooms, workshops, speakers, categories
    - registrations, payments, checkins, idempotency
    - notifications, outbox
    - workshop_documents, ai_summaries
    - audit_logs, workshop_change_logs, rate_limit_policies, circuit_breaker_events

## 5) Script CSV va du lieu mau

- Them script Go:
  - `data/generate_students_csv.go`
  - Ho tro tham so `-rows` va `-out`.
  - Mac dinh sinh 12000 dong.

- Commit sample CSV 500 dong:
  - `data/sample_students_500.csv`

## 6) Cap nhat env va tai lieu

- Cap nhat `src/.env.example`:
  - Sua `PGDATA` dung duong dan.
  - Them `REDIS_PASSWORD`.

- Cap nhat `README.md`:
  - Them section **Quick Start (T05)**.
  - Huong dan:
    - `docker compose up --build`
    - check health endpoint
    - generate CSV 500/12000 dong
    - stop stack
  - Liet ke tai khoan demo seed san.

## Cach chay nhanh

```bash
cp src/.env.example src/.env
docker compose -f src/docker-compose.yml up --build -d
curl http://localhost:8080/actuator/health
```

## Ghi chu

- Toan bo thay doi T05 huong den run duoc tren Docker va co du lieu demo de phuc vu cac task implementation tiep theo.
