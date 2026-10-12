export default async function handler(req, res) {
  // ==========================================
  // M.AWAJI LIVESCORES - BACKEND API
  // ==========================================

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Browser preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // GET requests only
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");

    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  // Require API key
  const API_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Football API key is not configured"
    });
  }

  const BASE_URL =
    "https://v3.football.api-sports.io";

  const query = req.query || {};
  const action = String(query.action || "").trim();

  // Validate numeric query parameters
  function validNumber(value) {
    return (
      value !== undefined &&
      value !== null &&
      /^\d+$/.test(String(value))
    );
  }

  // Validate date as YYYY-MM-DD
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      return false;
    }

    const d = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === value
    );
  }

  // Make API-Football request
  async function footballRequest(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}/${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY
      }
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("Football provider returned invalid JSON");
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        `Football provider returned HTTP ${response.status}`
      );

      error.status = response.status;
      throw error;
    }

    // API-Football can report provider errors inside a successful HTTP response.
    if (
      data &&
      data.errors &&
      Object.keys(data.errors).length > 0
    ) {
      const error = new Error(
        JSON.stringify(data.errors)
      );

      error.status = 502;
      throw error;
    }

    return data;
  }

  try {
    let endpoint;
    let params = {};

    // ==========================================
    // 1. LIVE MATCHES
    // GET ?action=live
    // ==========================================

    if (action === "live") {
      endpoint = "fixtures";

      params = {
        live: query.country || "all"
      };
    }

    // ==========================================
    // 2. FIXTURES
    // GET ?action=fixtures&date=YYYY-MM-DD
    // ==========================================

    else if (action === "fixtures") {
      endpoint = "fixtures";

      const date =
        query.date ||
        new Date().toISOString().slice(0, 10);

      if (!validDate(date)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date. Use YYYY-MM-DD."
        });
      }

      params = {
        date,
        timezone: query.timezone || "Africa/Lagos"
      };

      if (query.league) {
        if (!validNumber(query.league)) {
          return res.status(400).json({
            success: false,
            error: "Invalid league ID"
          });
        }

        params.league = query.league;
      }

      if (query.season) {
        if (!validNumber(query.season)) {
          return res.status(400).json({
            success: false,
            error: "Invalid season"
          });
        }

        params.season = query.season;
      }
    }

    // ==========================================
    // 3. RESULTS
    // GET ?action=results&date=YYYY-MM-DD
    // ==========================================

    else if (action === "results") {
      endpoint = "fixtures";

      const date =
        query.date ||
        new Date().toISOString().slice(0, 10);

      if (!validDate(date)) {
        return res.status(400).json({
          success: false,
          error: "Invalid date. Use YYYY-MM-DD."
        });
      }

      params = {
        date,
        status: "FT-AET-PEN",
        timezone: query.timezone || "Africa/Lagos"
      };
    }

    // ==========================================
    // 4. MATCH DETAILS
    // GET ?action=match&id=123
    // ==========================================

    else if (action === "match") {
      if (!validNumber(query.id)) {
        return res.status(400).json({
          success: false,
          error: "A valid match ID is required"
        });
      }

      endpoint = "fixtures";

      params = {
        id: query.id
      };
    }

    // ==========================================
    // 5. LEAGUE STANDINGS
    // GET ?action=standings&league=39&season=2026
    // ==========================================

    else if (action === "standings") {
      if (
        !validNumber(query.league) ||
        !validNumber(query.season)
      ) {
        return res.status(400).json({
          success: false,
          error: "League ID and season are required"
        });
      }

      endpoint = "standings";

      params = {
        league: query.league,
        season: query.season
      };
    }

    // ==========================================
    // 6. MATCH EVENTS
    // GET ?action=events&id=123
    // ==========================================

    else if (action === "events") {
      if (!validNumber(query.id)) {
        return res.status(400).json({
          success: false,
          error: "A valid match ID is required"
        });
      }

      endpoint = "fixtures/events";

      params = {
        fixture: query.id
      };
    }

    // ==========================================
    // 7. MATCH STATISTICS
    // GET ?action=statistics&id=123
    // ==========================================

    else if (action === "statistics") {
      if (!validNumber(query.id)) {
        return res.status(400).json({
          success: false,
          error: "A valid match ID is required"
        });
      }

      endpoint = "fixtures/statistics";

      params = {
        fixture: query.id
      };
    }

    // ==========================================
    // 8. MATCH LINEUPS
    // GET ?action=lineups&id=123
    // ==========================================

    else if (action === "lineups") {
      if (!validNumber(query.id)) {
        return res.status(400).json({
          success: false,
          error: "A valid match ID is required"
        });
      }

      endpoint = "fixtures/lineups";

      params = {
        fixture: query.id
      };
    }

    // ==========================================
    // 9. PLAYER STATISTICS
    // GET ?action=players&id=123
    // ==========================================

    else if (action === "players") {
      if (!validNumber(query.id)) {
        return res.status(400).json({
          success: false,
          error: "A valid match ID is required"
        });
      }

      endpoint = "fixtures/players";

      params = {
        fixture: query.id
      };
    }

    // ==========================================
    // 10. LEAGUES AND COMPETITIONS
    // GET ?action=leagues&search=Premier
    // ==========================================

    else if (action === "leagues") {
      endpoint = "leagues";

      params = {};

      if (query.search) {
        params.search = String(query.search).slice(0, 100);
      }

      if (query.country) {
        params.country = String(query.country).slice(0, 100);
      }

      if (query.season) {
        if (!validNumber(query.season)) {
          return res.status(400).json({
            success: false,
            error: "Invalid season"
          });
        }

        params.season = query.season;
      }

      if (query.id) {
        if (!validNumber(query.id)) {
          return res.status(400).json({
            success: false,
            error: "Invalid league ID"
          });
        }

        params.id = query.id;
      }
    }

    // ==========================================
    // 11. TEAM SEARCH
    // GET ?action=teams&search=Arsenal
    // ==========================================

    else if (action === "teams") {
      if (!query.search) {
        return res.status(400).json({
          success: false,
          error: "A team search term is required"
        });
      }

      endpoint = "teams";

      params = {
        search: String(query.search).slice(0, 100)
      };
    }

    // ==========================================
    // INVALID ACTION
    // ==========================================

    else {
      return res.status(400).json({
        success: false,
        error: "Invalid action",
        availableActions: [
          "live",
          "fixtures",
          "results",
          "match",
          "standings",
          "events",
          "statistics",
          "lineups",
          "players",
          "leagues",
          "teams"
        ]
      });
    }

    // ==========================================
    // FETCH DATA
    // ==========================================

    const data = await footballRequest(endpoint, params);

    // Short caching for live matches; longer for historical data.
    res.setHeader(
      "Cache-Control",
      action === "live"
        ? "s-maxage=15, stale-while-revalidate=15"
        : "s-maxage=60, stale-while-revalidate=120"
    );

    return res.status(200).json(data);

  } catch (error) {
    console.error("M.Awaji LiveScores API error:", error);

    const status =
      error.status === 401 || error.status === 403
        ? 502
        : error.status === 429
          ? 429
          : 502;

    return res.status(status).json({
      success: false,
      error: "Unable to retrieve football data",
      message: error.message
    });
  }
          }
