const https = require("https");

/**
 * Cloudinary Search API 호출 (EXIF 메타데이터 포함)
 */
function cloudinarySearch({ cloudName, apiKey, apiSecret, folder }) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const body = JSON.stringify({
      expression: `folder:${folder}/* AND resource_type:image`,
      max_results: 200,
      sort_by: [{ created_at: "desc" }],
      // ✅ EXIF 메타데이터 요청
      with_field: ["image_metadata", "context", "tags"]
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
 * GPS 좌표를 주소로 변환 (간단 버전)
 */
function formatGPS(lat, lon) {
  if (!lat || !lon) return null;
  
  // 실제로는 Reverse Geocoding API 사용 권장
  // 여기서는 좌표만 표시
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

/**
 * EXIF 날짜 파싱
 */
function parseExifDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // EXIF 형식: "2024:01:15 14:30:22"
    const cleaned = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const date = new Date(cleaned);
    
    if (isNaN(date)) return null;
    
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');
    
  } catch {
    return null;
  }
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

    const selected = resources.slice(0, 20);

    const items = selected.map((r) => {
      const meta = r.image_metadata || {};
      
      // A. 촬영 날짜
      const photoDate = parseExifDate(meta.DateTimeOriginal || meta.DateTime);
      
      // 업로드 날짜 (fallback)
      const uploadDate = r.created_at ? r.created_at.slice(0, 10).replace(/-/g, '.') : '';
      
      // B. 위치 정보
      let location = null;
      if (meta.GPSLatitude && meta.GPSLongitude) {
        location = formatGPS(meta.GPSLatitude, meta.GPSLongitude);
      }
      
      // C. 카메라 정보
      let camera = null;
      if (meta.Make || meta.Model) {
        camera = [meta.Make, meta.Model].filter(Boolean).join(' ');
        
        // 추가 정보
        const details = [];
        if (meta.FNumber) details.push(`f/${meta.FNumber}`);
        if (meta.ExposureTime) details.push(`${meta.ExposureTime}s`);
        if (meta.ISOSpeedRatings) details.push(`ISO ${meta.ISOSpeedRatings}`);
        
        if (details.length > 0) {
          camera += ` · ${details.join(', ')}`;
        }
      }

      return {
        image: r.secure_url,
        photoDate,        // 촬영 날짜/시간
        uploadDate,       // 업로드 날짜 (fallback)
        location,         // GPS 위치
        camera,           // 카메라 + 촬영 정보
        width: r.width,
        height: r.height,
      };
    });

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
