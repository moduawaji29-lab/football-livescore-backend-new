const API_BASE = "https://v3.football.api-sports.io";
const SCOREBAT_BASE = "https://www.scorebat.com/video-api/v3/";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function positiveInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function apiUrl(path, params) {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchFootball(path, params) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    const error = new Error("The football data provider is not configured. Set API_FOOTBALL_KEY in Vercel Environment Variables.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(apiUrl(path, params), {
    headers: { "x-apisports-key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const message = data?.errors && Object.keys(data.errors).length
      ? Object.values(data.errors).join("; ")
      : `Football provider returned HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status === 401 || response.status === 403 ? 502 : response.status;
    error.providerStatus = response.status;
    throw error;
  }
  // API-Football may return HTTP 200 while reporting account/key errors in `errors`.
  if (data?.errors && Object.keys(data.errors).length) {
    const message = Object.values(data.errors).join("; ");
    const error = new Error(message);
    error.status = 502;
    error.providerError = true;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const q = req.query || {};
  const action = String(q.action || "").toLowerCase();
  const date = q.date;
  const timezone = typeof q.timezone === "string" && /^[A-Za-z_]+(?:\/[A-Za-z_+-]+)*$/.test(q.timezone) ? q.timezone : "Africa/Lagos";
  const fixtureId = positiveInt(q.id || q.fixture);
  const league = positiveInt(q.league);
  const season = positiveInt(q.season);

  try {
    let data;
    switch (action) {
      case "live":
        data = await fetchFootball("fixtures", { live: q.league ? undefined : "all", league, timezone });
        break;
      case "fixtures":
        if (date && !validDate(date)) return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD." });
        data = await fetchFootball("fixtures", { date: date || new Date().toISOString().slice(0, 10), league, season, timezone });
        break;
      case "results":
        if (date && !validDate(date)) return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD." });
        data = await fetchFootball("fixtures", { date: date || new Date().toISOString().slice(0, 10), league, season, status: "FT-AET-PEN", timezone });
        break;
      case "standings":
        if (!league || !season) return res.status(400).json({ error: "League and season are required positive integers." });
        data = await fetchFootball("standings", { league, season });
        break;
      case "match":
        if (!fixtureId) return res.status(400).json({ error: "A valid match ID is required." });
        data = await fetchFootball("fixtures", { id: fixtureId, timezone });
        break;
      case "events":
        if (!fixtureId) return res.status(400).json({ error: "A valid match ID is required." });
        data = await fetchFootball("fixtures/events", { fixture: fixtureId });
        break;
      case "statistics":
      case "stats":
        if (!fixtureId) return res.status(400).json({ error: "A valid match ID is required." });
        data = await fetchFootball("fixtures/statistics", { fixture: fixtureId });
        break;
      case "lineups":
        if (!fixtureId) return res.status(400).json({ error: "A valid match ID is required." });
        data = await fetchFootball("fixtures/lineups", { fixture: fixtureId });
        break;
      case "players":
        if (!fixtureId) return res.status(400).json({ error: "A valid match ID is required." });
        data = await fetchFootball("fixtures/players", { fixture: fixtureId });
        break;
      case "form": {
        const team = positiveInt(q.team);
        if (!team || !season) return res.status(400).json({ error: "A valid team ID and season are required." });
        // Last five fixtures are used to derive W/D/L form in the frontend.
        data = await fetchFootball("fixtures", { team, last: 5, season, timezone });
        break;
      }
      case "headtohead": {
        const home = positiveInt(q.home);
        const away = positiveInt(q.away);
        if (!home || !away || home === away) return res.status(400).json({ error: "Two different valid team IDs are required." });
        data = await fetchFootball("fixtures/headtohead", { h2h: `${home}-${away}`, last: 10, timezone });
        break;
      }
      case "leagues":
        data = await fetchFootball("leagues", { country: typeof q.country === "string" ? q.country.slice(0, 80) : undefined, season });
        break;
      case "teams": {
        const search = typeof q.search === "string" ? q.search.trim().slice(0, 80) : "";
        const teamId = positiveInt(q.team);
        if (!search && !teamId) return res.status(400).json({ error: "Provide a team ID or search term." });
        data = await fetchFootball("teams", { id: teamId, search });
        break;
      }
      case "videos": {
        // ScoreBat supplies selected official/embeddable football videos, not a guaranteed live stream for every match.
        const response = await fetch(SCOREBAT_BASE, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return res.status(502).json({ error: "Video provider is temporarily unavailable." });
        const videoData = await response.json();
        const wanted = typeof q.search === "string" ? q.search.trim().toLowerCase().slice(0, 80) : "";
        const matches = Array.isArray(videoData?.response) ? videoData.response : [];
        const filtered = wanted ? matches.filter(item => `${item.title || ""} ${item.competition || ""}`.toLowerCase().includes(wanted)) : matches;
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
        return res.status(200).json({ provider: "ScoreBat", type: "official video highlights and selected broadcasts", live_streaming_guaranteed: false, response: filtered.slice(0, 50) });
      }
      default:
        return res.status(400).json({
          error: "Invalid action.",
          supportedActions: ["live", "fixtures", "results", "standings", "match", "events", "statistics", "lineups", "players", "form", "headtohead", "leagues", "teams", "videos"]
        });
    }

    res.setHeader("Cache-Control", action === "live" ? "s-maxage=15, stale-while-revalidate=30" : "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (error) {
    console.error("Football API error:", { action, message: error.message, providerStatus: error.providerStatus });
    const status = Number.isInteger(error.status) ? error.status : 502;
    return res.status(status).json({
      error: error.message || "Unable to fetch football data.",
      action,
      hint: status === 503 ? "Configure API_FOOTBALL_KEY in Vercel." : status === 502 ? "Check API-Football account status, key permissions, and plan coverage." : undefined
    });
  }
}
