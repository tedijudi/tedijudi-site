const https = require("https");

/**
 * Cloudinary Search API 호출
 */
function cloudinarySearch({ cloudName, apiKey, apiSecret, folder }) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const body = JSON.stringify({
      expression: `folder:${folder}/* AND resource_type:image`,
      max_results: 200,
      sort_by: [{ created_at: "desc" }],
    });

    const options = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${cloudName}/resources/search`,
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error("JSON parse error: " + err.message));
          }
        } else {
          reject(new Error(`Cloudinary API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Netlify Function Handler
 */
exports.handler = async function (event, context) {
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
  const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "my_love";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 환경변수 확인
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Missing environment variables",
        detail: "CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET 필요",
      }),
    };
  }

  try {
    console.log(`Searching folder: ${CLOUDINARY_FOLDER}`);

    const data = await cloudinarySearch({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      apiSecret: CLOUDINARY_API_SECRET,
      folder: CLOUDINARY_FOLDER,
    });

    const resources = data.resources || [];
    console.log(`Found ${resources.length} images`);

    if (resources.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: [] }),
      };
    }

    // Fisher-Yates 랜덤 섞기
    for (let i = resources.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [resources[i], resources[j]] = [resources[j], resources[i]];
    }

    // 최대 20장 선택
    const selected = resources.slice(0, 20);

    const items = selected.map((r, idx) => ({
      image: r.secure_url,
      name: `${CLOUDINARY_FOLDER} #${idx + 1}`,
      meta: r.created_at ? r.created_at.slice(0, 10) : "",
      desc: r.context?.custom?.caption || "",
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items }),
    };

  } catch (err) {
    console.error("Cloudinary function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "cloudinary_request_failed",
        detail: err.message,
      }),
    };
  }
};
