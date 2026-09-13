export default async function handler(req, res) {
  // Allow the frontend to communicate with this API
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle browser CORS check
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: "API_FOOTBALL_KEY is not configured."
    });
  }

  const action = req.query.action || "live";

  const today = new Date().toISOString().split("T")[0];

  let apiUrl;

  // LIVE MATCHES
  if (action === "live") {
    apiUrl =
      "https://v3.football.api-sports.io/fixtures?live=all";
  }

  // TODAY'S FIXTURES
  else if (action === "fixtures") {
    const date = req.query.date || today;

    apiUrl =
      `https://v3.football.api-sports.io/fixtures?date=${encodeURIComponent(date)}`;
  }

  // RESULTS
  else if (action === "results") {
    const date = req.query.date || today;

    apiUrl =
      `https://v3.football.api-sports.io/fixtures?date=${encodeURIComponent(date)}&status=FT`;
  }

  // MATCH DETAILS
  else if (action === "match") {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Match ID is required."
      });
    }

    apiUrl =
      `https://v3.football.api-sports.io/fixtures?id=${encodeURIComponent(id)}`;
  }

  // STANDINGS
  else if (action === "standings") {
    const league = req.query.league;
    const season = req.query.season;

    if (!league || !season) {
      return res.status(400).json({
        success: false,
        error: "League ID and season are required."
      });
    }

    apiUrl =
      `https://v3.football.api-sports.io/standings?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`;
  }

  // TEAM INFORMATION
  else if (action === "team") {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Team ID is required."
      });
    }

    apiUrl =
      `https://v3.football.api-sports.io/teams?id=${encodeURIComponent(id)}`;
  }

  // LEAGUES
  else if (action === "leagues") {
    apiUrl =
      "https://v3.football.api-sports.io/leagues";
  }

  // TEAM FIXTURES
  else if (action === "team-fixtures") {
    const team = req.query.team;

    if (!team) {
      return res.status(400).json({
        success: false,
        error: "Team ID is required."
      });
    }

    apiUrl =
      `https://v3.football.api-sports.io/fixtures?team=${encodeURIComponent(team)}&last=10`;
  }

  else {
    return res.status(400).json({
      success: false,
      error: "Unknown action.",
      availableActions: [
        "live",
        "fixtures",
        "results",
        "match",
        "standings",
        "team",
        "leagues",
        "team-fixtures"
      ]
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY
      }
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Unable to connect to the football data service."
    });
  }
}
