# Fullstack Task API with SQLite

## What this is
A CRUD REST API for managing tasks, backed by a SQLite database.

## Why SQLite?
SQLite was chosen because it requires zero setup — no server to install, 
no passwords, no configuration. The entire database lives in a single file 
(tasks.db) that is created automatically when the app starts. 
Perfect for development and small applications.

## How to run
1. Clone the repository
2. Install dependencies:
 npm install
3. Start the server:
  node server.js
4. The database (tasks.db) is created automatically with 3 example tasks

## API Endpoints
| Method | URL | Description |

| GET | /tasks | Get all tasks |
| GET | /tasks/:id | Get one task |
| POST | /tasks | Create a task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |

## Example SQL query
SELECT * FROM tasks WHERE done = 1;
Returns all completed tasks

## Database screenshot
(db-screenshot.png)