# Research Opportunity Portal

Node.js + Express REST API, MySQL database, plain HTML/CSS/JS frontend (served by the same server).

## Run it
1. Install Node.js 18+ and MySQL 8+.
2. Create the database and sample data:  `mysql -u root -p < schema.sql`
3. `cp .env.example .env` and put your MySQL password in it.
4. `npm install`
5. `npm start`  then open http://localhost:3000

## API
| Method | Route | Success | Errors |
|---|---|---|---|
| POST | /api/opportunities | 201 | 400, 500 |
| GET | /api/opportunities | 200 | 500 |
| GET | /api/opportunities/:id | 200 | 400, 404, 500 |
| PUT | /api/opportunities/:id | 200 | 400, 404, 500 |
| DELETE | /api/opportunities/:id | 200 | 400, 404, 500 |

Fields: title, description, research_area, faculty_name, department, required_skills, positions, deadline (YYYY-MM-DD), status (Open or Closed).
PUT accepts any subset of fields, so `{"status":"Closed"}` closes an opportunity.
# Project---Research-Opportunity-Portal
