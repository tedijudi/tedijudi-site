const https = require("https");

function cloudinarySearch({ cloudName, apiKey, apiSecret, folder }) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const body = JSON.stringify({
      expression: `folder:${folder}/* AND resource_type:image`,
      max_results: 200,
      sort_by: [{ created_at: "desc" }]
    });

    const options = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${cloudName}/resources/search`,
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => data += d);
      res.on("end", () => resolve(JSON.parse(data)));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function () {
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
  const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "my_love";

  try {
    const data = await cloudinarySearch({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      apiSecret: CLOUDINARY_API_SECRET,
      folder: CLOUDINARY_FOLDER
    });

    const resources = data.resources || [];

    // ✅ 매번 랜덤 + 5장만
    const shuffled = resources.sort(() => Math.random() - 0.5).slice(0, 5);

    const items = shuffled.map((r, i) => ({
      image: r.secure_url,
      name: `Photo ${i + 1}`
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ items })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
