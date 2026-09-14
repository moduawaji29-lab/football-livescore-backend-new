export default async function handler(req, res) {

  // Allow your GitHub Pages frontend to access this API
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Handle browser CORS check
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const action =
      req.query.action || "";

    const date =
      req.query.date;


    let url =
      "https://v3.football.api-sports.io/fixtures";


    /*
     * LIVE MATCHES
     */
    if (action === "live") {

      url += "?live=all";

    }


    /*
     * FIXTURES
     */
    else if (action === "fixtures") {

      const fixtureDate =
        date ||
        new Date()
          .toISOString()
          .split("T")[0];

      url += `?date=${fixtureDate}`;

    }


    /*
     * RESULTS
     */
    else if (action === "results") {

      const resultDate =
        date ||
        new Date()
          .toISOString()
          .split("T")[0];

      url +=
        `?date=${resultDate}&status=FT`;

    }


    /*
     * STANDINGS
     */
    else if (action === "standings") {

      const league =
        req.query.league;

      const season =
        req.query.season;

      if (!league || !season) {

        return res.status(400).json({
          error:
            "League and season are required"
        });

      }

      url =
        `https://v3.football.api-sports.io/standings?league=${league}&season=${season}`;

    }


    /*
     * MATCH DETAILS
     */
    else if (action === "match") {

      const id =
        req.query.id;

      if (!id) {

        return res.status(400).json({
          error:
            "Match ID is required"
        });

      }

      url =
        `https://v3.football.api-sports.io/fixtures?id=${id}`;

    }


    /*
     * INVALID ACTION
     */
    else {

      return res.status(400).json({
        error: "Invalid action"
      });

    }


    /*
     * CALL API-FOOTBALL
     */
    const response =
      await fetch(url, {

        headers: {
          "x-apisports-key":
            process.env.API_FOOTBALL_KEY
        }

      });


    const data =
      await response.json();


    /*
     * RETURN API RESPONSE
     */
    return res
      .status(response.ok ? 200 : response.status)
      .json(data);


  } catch (error) {

    console.error(
      "Football API error:",
      error
    );


    return res.status(500).json({

      error:
        "Unable to fetch football data"

    });

  }

}
