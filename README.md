# ☕ Coffee Rating Application

An interactive voting application with database-backed vote counts, live UI updates, and a top-rated leaderboard.

## Features

- Coffee/product grid
- Persistent vote counts in MongoDB
- `POST /api/coffees/:id/vote` increments votes atomically
- UI updates without page refresh
- Top-5 leaderboard sorted by votes
- Responsive design
- Single Express server serves both frontend and API

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose

## Run locally

1. Install Node.js.
2. Clone this repository.
3. Run:

```bash
npm install
```

4. Create `.env` from `.env.example`.
5. Put your MongoDB Atlas connection string in `MONGODB_URI`.
6. Start:

```bash
npm start
```

7. Open `http://localhost:3000`.

For development:

```bash
npm run dev
```

## API

### Get all coffees

`GET /api/coffees`

### Vote for a coffee

`POST /api/coffees/:id/vote`

The backend uses MongoDB `$inc` so each vote safely increments the stored counter.

### Get leaderboard

`GET /api/leaderboard`

## Deploy on Render

Create a new Web Service from the GitHub repository.

- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variable:
  - `MONGODB_URI` = your MongoDB Atlas URI

Render will provide a live URL such as:

`https://your-app-name.onrender.com`

## MongoDB Atlas security

Do not put your MongoDB username/password in GitHub.

For a college/demo project, keep credentials in environment variables. After testing, restrict Atlas network access to the deployment environment/IPs where practical instead of leaving `0.0.0.0/0` permanently open.

## Submission proof

Submit:

1. GitHub repository URL
2. Live web application URL

Recommended README additions before submission:

- Screenshot of the coffee grid
- Screenshot showing a vote count changing
- Screenshot of the leaderboard
- API endpoint names
- Tech stack
