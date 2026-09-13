export default async function handler(req, res) {
  try {
    const action = req.query.action || "live";
    const date = req.query.date;

    let url = "https://v3.football.api-sports.io/fixtures";

    if (action === "live") {
      url += "?live=all";
    }

    else if (action === "fixtures") {
      url += `?date=${date || new Date().toISOString().split("T")[0]}`;
    }

    else if (action === "results") {
      url += `?date=${date || new Date().toISOString().split("T")[0]}&status=FT`;
    }

    else if (action === "standings") {
      const league = req.query.league;
      const season = req.query.season;

      url =
        `https://v3.football.api-sports.io/standings?league=${league}&season=${season}`;
    }

    else if (action === "match") {
      const id = req.query.id;

      url =
        `https://v3.football.api-sports.io/fixtures?id=${id}`;
    }

    else {
      return res.status(400).json({
        error: "Invalid action"
      });
    }

    const response = await fetch(url, {
      headers: {
        "x-apisports-key": process.env.API_FOOTBALL_KEY
      }
    });

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {

    res.status(500).json({
      error: "Unable to fetch football data"
    });

  }
}
