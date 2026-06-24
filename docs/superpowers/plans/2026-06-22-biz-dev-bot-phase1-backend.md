# Biz Dev Bot -- Phase 1: Backend Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Scaffold the FastAPI backend with PostgreSQL, all 6 data models, JWT auth, and Contacts + Pipelines CRUD API.

**Architecture:** FastAPI async server with SQLAlchemy 2.0 async ORM, Alembic migrations, Pydantic v2 schemas, JWT bearer auth. Docker Compose for local dev (API + PostgreSQL).

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, python-jose, passlib+bcrypt, pytest, httpx, Docker Compose

---

## File Structure

```
biz-dev-bot/
+-- docker-compose.yml
+-- backend/
    +-- Dockerfile
    +-- requirements.txt
    +-- .env.example
    +-- alembic.ini
    +-- alembic/
    |   +-- env.py
    |   +-- versions/
    +-- app/
    |   +-- __init__.py
    |   +-- main.py
    |   +-- config.py
    |   +-- database.py
    |   +-- models/
    |   |   +-- __init__.py
    |   |   +-- base.py
    |   |   +-- contact.py
    |   |   +-- pipeline.py
    |   |   +-- activity.py
    |   |   +-- campaign.py
    |   |   +-- email_message.py
    |   |   +-- scheduled_task.py
    |   +-- schemas/
    |   |   +-- __init__.py
    |   |   +-- contact.py
    |   |   +-- pipeline.py
    |   +-- routers/
    |   |   +-- __init__.py
    |   |   +-- auth.py
    |   |   +-- contacts.py
    |   |   +-- pipelines.py
    |   +-- services/
    |   |   +-- __init__.py
    |   |   +-- contact.py
    |   |   +-- pipeline.py
    |   +-- auth/
    |       +-- __init__.py
    |       +-- jwt.py
    +-- tests/
        +-- __init__.py
        +-- conftest.py
        +-- test_contacts.py
        +-- test_pipelines.py
```

---

## Task 1: Project Scaffold

- [ ] Create directory structure
- [ ] Write requirements.txt
- [ ] Write config.py
- [ ] Write database.py
- [ ] Write main.py
- [ ] Write Dockerfile
- [ ] Write docker-compose.yml
- [ ] Write .env.example
- [ ] Verify server starts
- [ ] Commit
