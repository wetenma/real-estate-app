const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const xml2js = require("xml2js");
const mysql = require("mysql2/promise");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SERVICE_KEY = process.env.SERVICE_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const PORT = process.env.PORT || 4000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const regions = [
  { name: "강남구", lawdCd: "11680" },
  { name: "서초구", lawdCd: "11650" },
  { name: "송파구", lawdCd: "11710" },
  { name: "마포구", lawdCd: "11440" },
  { name: "용산구", lawdCd: "11170" },
  { name: "성동구", lawdCd: "11200" },
  { name: "강동구", lawdCd: "11740" },
  { name: "영등포구", lawdCd: "11560" },
  { name: "양천구", lawdCd: "11470" },
  { name: "노원구", lawdCd: "11350" },
  { name: "분당구", lawdCd: "41135" },
  { name: "수원시", lawdCd: "41110" },
  { name: "용인시", lawdCd: "41461" },
  { name: "고양시", lawdCd: "41281" },
  { name: "성남시", lawdCd: "41131" },
  { name: "화성시", lawdCd: "41590" },
  { name: "남양주시", lawdCd: "41360" },
  { name: "평택시", lawdCd: "41220" },
  { name: "인천 연수구", lawdCd: "28185" },
  { name: "인천 남동구", lawdCd: "28200" },
  { name: "인천 서구", lawdCd: "28260" },
  { name: "원주시", lawdCd: "51130" },
  { name: "춘천시", lawdCd: "51110" },
  { name: "강릉시", lawdCd: "51150" },
  { name: "부산 해운대구", lawdCd: "26350" },
  { name: "대구 수성구", lawdCd: "27260" },
  { name: "대전 유성구", lawdCd: "30200" },
  { name: "광주 광산구", lawdCd: "29200" },
];

const url =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      region_name VARCHAR(50),
      lawd_cd VARCHAR(10),
      apt_name VARCHAR(100),
      deal_amount INT,
      area FLOAT,
      floor INT,
      build_year INT,
      deal_year INT,
      deal_month INT,
      deal_day INT,
      dong VARCHAR(100),
      deal_ymd VARCHAR(6),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      lat DECIMAL(10, 7) NULL,
      lng DECIMAL(10, 7) NULL,
      UNIQUE KEY unique_apartment_deal (
        lawd_cd,
        apt_name,
        deal_amount,
        area,
        floor,
        deal_year,
        deal_month,
        deal_day,
        dong
      )
    )
  `);

  console.log("apartments 테이블 준비 완료");
}

function cleanNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replaceAll(",", "").trim();
  return cleaned === "" ? null : Number(cleaned);
}

async function saveApartmentsToDB(items, lawdCd, dealYmd) {
  for (const item of items) {
    await pool.query(
      `
      INSERT IGNORE INTO apartments
(
  region_name,
  lawd_cd,
  apt_name,
  deal_amount,
  area,
  floor,
  build_year,
  deal_year,
  deal_month,
  deal_day,
  dong,
  jibun,
  deal_ymd
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        item.regionName,
        lawdCd,
        item.aptName,
        cleanNumber(item.dealAmount),
        cleanNumber(item.area),
        cleanNumber(item.floor),
        cleanNumber(item.buildYear),
        cleanNumber(item.dealYear),
        cleanNumber(item.dealMonth),
        cleanNumber(item.dealDay),
        item.dong,
        item.jibun,
        dealYmd,
      ]
    );
  }
}

async function fetchApartmentData(region, dealYmd) {
  const response = await axios.get(url, {
    params: {
      serviceKey: SERVICE_KEY,
      LAWD_CD: region.lawdCd,
      DEAL_YMD: dealYmd,
      numOfRows: 100,
      pageNo: 1,
    },
  });

  const data = response.data;
  let items = [];

  if (typeof data === "object") {
    items = data.response?.body?.items?.item || [];
  } else {
    const parsed = await xml2js.parseStringPromise(data, {
      explicitArray: false,
    });
    items = parsed.response?.body?.items?.item || [];
  }

  if (!Array.isArray(items)) items = [items];

  console.log(items[0]);

  return items.map((item) => ({
    regionName: region.name,
    aptName: item.aptNm,
    dealAmount: item.dealAmount,
    area: item.excluUseAr,
    floor: item.floor,
    buildYear: item.buildYear,
    dealYear: item.dealYear,
    dealMonth: item.dealMonth,
    dealDay: item.dealDay,
    dong: item.umdNm,
    jibun: item.jibun,
  }));
}

async function searchKakaoPlace(query) {
  if (!KAKAO_REST_API_KEY) return null;

  const headers = {
    Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
  };

  try {
    const addressResponse = await axios.get(
      "https://dapi.kakao.com/v2/local/search/address.json",
      {
        headers,
        params: {
          query,
          size: 1,
        },
      }
    );

    const addressDocs = addressResponse.data.documents || [];
    if (addressDocs.length > 0) {
      return {
        lat: addressDocs[0].y,
        lng: addressDocs[0].x,
      };
    }
  } catch (error) {
    console.log("주소검색 실패:", query, error.message);
  }

  try {
    const keywordResponse = await axios.get(
      "https://dapi.kakao.com/v2/local/search/keyword.json",
      {
        headers,
        params: {
          query,
          size: 1,
        },
      }
    );

    const keywordDocs = keywordResponse.data.documents || [];
    if (keywordDocs.length > 0) {
      return {
        lat: keywordDocs[0].y,
        lng: keywordDocs[0].x,
      };
    }
  } catch (error) {
    console.log("키워드검색 실패:", query, error.message);
  }

  return null;
}

async function geocodeApartmentsByRegion(regionName, dealYmd, limit = 300) {
  if (!KAKAO_REST_API_KEY) return;

  const [apartments] = await pool.query(
    `
    SELECT id, region_name, dong, jibun, apt_name
    FROM apartments
    WHERE region_name = ?
      AND deal_ymd = ?
      AND (lat IS NULL OR lng IS NULL)
    ORDER BY id ASC
    LIMIT ?
    `,
    [regionName, dealYmd, limit]
  );

  for (const apt of apartments) {
    const queries = [];

    if (apt.jibun) {
      queries.push(`${apt.region_name} ${apt.dong} ${apt.jibun}`);
      queries.push(`${apt.dong} ${apt.jibun}`);
    }

    queries.push(`${apt.region_name} ${apt.dong} ${apt.apt_name}`);
    queries.push(`${apt.dong} ${apt.apt_name}`);
    queries.push(apt.apt_name);

    let place = null;

    for (const query of queries) {
      place = await searchKakaoPlace(query);
      if (place) break;
    }

    if (!place) {
      console.log(
        "좌표 최종 실패:",
        apt.region_name,
        apt.dong,
        apt.jibun,
        apt.apt_name
      );
      continue;
    }

    await pool.query(
      `
      UPDATE apartments
      SET lat = ?, lng = ?
      WHERE apt_name = ?
        AND region_name = ?
        AND dong = ?
      `,
      [place.lat, place.lng, apt.apt_name, apt.region_name, apt.dong]
    );
  }
}

app.get("/api/regions", async (req, res) => {
  try {
    const dealYmd = req.query.dealYmd || "202405";

    const results = await Promise.all(
      regions.map(async (region) => {
        const data = await fetchApartmentData(region, dealYmd);
        await saveApartmentsToDB(data, region.lawdCd, dealYmd);
        await geocodeApartmentsByRegion(region.name, dealYmd, 200);
        return data;
      })
    );

    const flatData = results.flat();

    const summary = regions.map((region) => {
      const regionItems = flatData.filter(
        (item) => item.regionName === region.name
      );

      const prices = regionItems.map((item) =>
        Number(String(item.dealAmount).replaceAll(",", "").trim())
      );

      const avg =
        prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : 0;

      const max = prices.length > 0 ? Math.max(...prices) : 0;
      const min = prices.length > 0 ? Math.min(...prices) : 0;

      return {
        name: region.name,
        count: regionItems.length,
        avgPrice: avg,
        avgPriceText: `${(avg / 10000).toFixed(1)}억`,
        maxPriceText: `${(max / 10000).toFixed(1)}억`,
        minPriceText: `${(min / 10000).toFixed(1)}억`,
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({
      message: "지역 실거래가 조회 실패",
      error: error.message,
      apiResponse: error.response?.data,
    });
  }
});

app.get("/api/db/apartments", async (req, res) => {
  try {
    const regionName = req.query.regionName;
    const dealYmd = req.query.dealYmd || "202405";
    await geocodeApartmentsByRegion(regionName, dealYmd, 200);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM apartments
      WHERE region_name = ?
        AND deal_ymd = ?
      ORDER BY deal_amount DESC
      LIMIT 100
      `,
      [regionName, dealYmd]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "DB 아파트 조회 실패",
      error: error.message,
    });
  }
});

app.get("/api/db/dongs", async (req, res) => {
  try {
    const regionName = req.query.regionName;
    const dealYmd = req.query.dealYmd || "202405";

    const [rows] = await pool.query(
      `
      SELECT
        dong,
        COUNT(*) AS count,
        AVG(deal_amount) AS avgPrice,
        MAX(deal_amount) AS maxPrice,
        MIN(deal_amount) AS minPrice,
        AVG(lat) AS lat,
        AVG(lng) AS lng
      FROM apartments
      WHERE region_name = ?
        AND deal_ymd = ?
        AND dong IS NOT NULL
      GROUP BY dong
      ORDER BY avgPrice DESC
      `,
      [regionName, dealYmd]
    );

    res.json(
      rows.map((row) => ({
        dong: row.dong,
        count: row.count,
        avgPrice: Number(row.avgPrice || 0),
        avgPriceText: `${(Number(row.avgPrice || 0) / 10000).toFixed(1)}억`,
        maxPriceText: `${(Number(row.maxPrice || 0) / 10000).toFixed(1)}억`,
        minPriceText: `${(Number(row.minPrice || 0) / 10000).toFixed(1)}억`,
        lat: row.lat ? Number(row.lat) : null,
        lng: row.lng ? Number(row.lng) : null,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "동별 통계 조회 실패",
      error: error.message,
    });
  }
});

app.get("/api/db/dong-extremes", async (req, res) => {
  try {
    const { regionName, dong } = req.query;
    const dealYmd = req.query.dealYmd || "202405";

    const [maxRows] = await pool.query(
      `
      SELECT *
      FROM apartments
      WHERE region_name = ?
        AND dong = ?
        AND deal_ymd = ?
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      ORDER BY deal_amount DESC
      LIMIT 1
      `,
      [regionName, dong, dealYmd]
    );

    const [minRows] = await pool.query(
      `
      SELECT *
      FROM apartments
      WHERE region_name = ?
        AND dong = ?
        AND deal_ymd = ?
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      ORDER BY deal_amount ASC
      LIMIT 1
      `,
      [regionName, dong, dealYmd]
    );

    res.json({
      max: maxRows[0] || null,
      min: minRows[0] || null,
    });
  } catch (error) {
    res.status(500).json({
      message: "동 최고가/최저가 조회 실패",
      error: error.message,
    });
  }
});

app.get("/api/db/region-trend", async (req, res) => {
  try {
    const regionName = req.query.regionName;

    const [rows] = await pool.query(
      `
      SELECT deal_ymd, AVG(deal_amount) AS avgPrice
      FROM apartments
      WHERE region_name = ?
      GROUP BY deal_ymd
      ORDER BY deal_ymd
      `,
      [regionName]
    );

    res.json(
      rows.map((row) => ({
        dealYmd: row.deal_ymd,
        avgPrice: Number(row.avgPrice || 0),
        avgPriceText: `${(Number(row.avgPrice || 0) / 10000).toFixed(1)}억`,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "가격 추이 조회 실패",
      error: error.message,
    });
  }
});

app.listen(PORT, async () => {
  try {
    await createTables();
    console.log(`서버 실행중: http://localhost:${PORT}`);
  } catch (error) {
    console.error("DB 연결 실패:", error.message);
  }
});

