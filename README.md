# Task API  Containerized with Docker + PostgreSQL

## What this is
A CRUD REST API for managing tasks, backed by PostgreSQL running in Docker.

## Storage journey
- A1: In-memory (lost on restart)
- A2: SQLite file (survived restarts)
- A3: PostgreSQL in Docker (production-ready)

## How to run (one command)
cp .env.example .env
docker-compose up

## Environment variables
See .env.example for required variables.

## API Endpoints
| Method | URL | Description |
| GET | /tasks | Get all tasks |
| GET | /tasks/:id | Get one task |
| POST | /tasks | Create a task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |

## Example
curl -i http://localhost:3000/tasks

## Why PostgreSQL in Docker?
- No local installation needed
- Same environment everywhere
- Data persists via Docker volumes
- One command starts everything