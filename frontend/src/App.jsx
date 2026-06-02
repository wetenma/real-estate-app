import { useEffect, useRef, useState } from "react";
import "./App.css";

const regionPosition = {
  강남구: { lat: 37.5172, lng: 127.0473 },
  서초구: { lat: 37.4837, lng: 127.0324 },
  송파구: { lat: 37.5145, lng: 127.1059 },
  마포구: { lat: 37.5663, lng: 126.9019 },
  용산구: { lat: 37.5326, lng: 126.9900 },
  성동구: { lat: 37.5633, lng: 127.0369 },
  강동구: { lat: 37.5301, lng: 127.1238 },
  영등포구: { lat: 37.5264, lng: 126.8962 },
  양천구: { lat: 37.5169, lng: 126.8664 },
  노원구: { lat: 37.6542, lng: 127.0568 },

  분당구: { lat: 37.3828, lng: 127.1189 },
  수원시: { lat: 37.2636, lng: 127.0286 },
  용인시: { lat: 37.2411, lng: 127.1776 },
  고양시: { lat: 37.6584, lng: 126.8320 },
  성남시: { lat: 37.4200, lng: 127.1265 },
  화성시: { lat: 37.1995, lng: 126.8312 },
  남양주시: { lat: 37.6360, lng: 127.2165 },
  평택시: { lat: 36.9921, lng: 127.1127 },

  "인천 연수구": { lat: 37.4102, lng: 126.6788 },
  "인천 남동구": { lat: 37.4473, lng: 126.7315 },
  "인천 서구": { lat: 37.5455, lng: 126.6759 },

  원주시: { lat: 37.3422, lng: 127.9202 },
  춘천시: { lat: 37.8813, lng: 127.7298 },
  강릉시: { lat: 37.7519, lng: 128.8761 },

  "부산 해운대구": { lat: 35.1631, lng: 129.1636 },
  "대구 수성구": { lat: 35.8582, lng: 128.6307 },
  "대전 유성구": { lat: 36.3623, lng: 127.3562 },
  "광주 광산구": { lat: 35.1399, lng: 126.7937 },
};

function App() {
  const [regionData, setRegionData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedArea, setSelectedArea] = useState("전체");
  const [selectedYear, setSelectedYear] = useState("전체");
  const [selectedDealYmd, setSelectedDealYmd] = useState("202405");
  const [loading, setLoading] = useState(true);

  const mapRef = useRef(null);
  const overlayRefs = useRef([]);

  const areaOptions = ["전체", "59㎡", "76㎡", "84㎡", "101㎡"];
  const yearOptions = ["전체", "1970년대", "1990년대", "2000년대", "2010년대", "2020년대"];
  const dealMonthOptions = ["202405", "202404", "202403", "202402", "202401", "202312"];

  useEffect(() => {
    setLoading(true);
    setSelectedApartment(null);

    fetch(`http://localhost:4000/api/regions?dealYmd=${selectedDealYmd}`)
      .then((res) => res.json())
      .then((data) => {
        const converted = data.map((region, index) => {
          const pos = regionPosition[region.name] || { lat: 37.5665, lng: 126.978 };

          return {
            id: index + 1,
            name: region.name,
            price: region.avgPriceText,
            count: region.count,
            max: region.maxPriceText,
            min: region.minPriceText,
            lat: pos.lat,
            lng: pos.lng,
            chart: [
              Number(((region.avgPrice / 10000) * 0.75).toFixed(1)),
              Number(((region.avgPrice / 10000) * 0.9).toFixed(1)),
              Number((region.avgPrice / 10000).toFixed(1)),
            ],
            apartments: region.apartments.map((apt) => ({
              name: apt.aptName,
              area: `${Number(apt.area).toFixed(2)}㎡`,
              rawArea: Number(apt.area),
              year: Number(apt.buildYear),
              price: `${(
                Number(String(apt.dealAmount).replaceAll(",", "").trim()) / 10000
              ).toFixed(1)}억`,
              floor: `${apt.floor}층`,
              dong: apt.dong,
              dealDate: `${apt.dealYear}.${apt.dealMonth}.${apt.dealDay}`,
            })),
          };
        });

        setRegionData(converted);
        setSelectedRegion(converted[0]);
        setSearchText(converted[0]?.name || "");
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        alert("실거래가 데이터를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, [selectedDealYmd]);

  const handleSelectRegion = (region) => {
    setSelectedRegion(region);
    setSelectedApartment(null);
    setSearchText(region.name);
    setOpenFilter(null);
  };

  useEffect(() => {
    if (!selectedRegion || !window.kakao || regionData.length === 0) return;

    window.kakao.maps.load(() => {
      const container = document.getElementById("kakao-map");

      const options = {
        center: new window.kakao.maps.LatLng(37.4979, 127.0276),
        level: 9,
      };

      const map = new window.kakao.maps.Map(container, options);
      mapRef.current = map;

      overlayRefs.current = regionData.map((region) => {
        const position = new window.kakao.maps.LatLng(region.lat, region.lng);

        const markerEl = document.createElement("button");
        markerEl.className = "map-marker";
        markerEl.innerHTML = `
          <span>${region.name}</span>
          <strong>${region.price}</strong>
        `;

        markerEl.addEventListener("click", () => {
          handleSelectRegion(region);
          map.panTo(position);
        });

        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content: markerEl,
          yAnchor: 1,
        });

        overlay.setMap(map);

        return { id: region.id, element: markerEl, position };
      });
    });
  }, [regionData]);

  useEffect(() => {
    if (!selectedRegion) return;

    overlayRefs.current.forEach((marker) => {
      marker.element.classList.toggle("active", marker.id === selectedRegion.id);
    });

    if (mapRef.current && window.kakao) {
      const position = new window.kakao.maps.LatLng(selectedRegion.lat, selectedRegion.lng);
      mapRef.current.panTo(position);
    }
  }, [selectedRegion]);

  const handleSearch = () => {
    const keyword = searchText.trim();

    if (!keyword) {
      alert("검색어를 입력해주세요.");
      return;
    }

    const result = regionData.find((region) => region.name.includes(keyword));

    if (result) {
      handleSelectRegion(result);
    } else {
      alert("검색 결과가 없습니다.");
    }
  };

  const checkAreaFilter = (rawArea) => {
    if (selectedArea === "전체") return true;

    const targetArea = Number(selectedArea.replace("㎡", ""));
    return rawArea >= targetArea - 3 && rawArea <= targetArea + 3;
  };

  const checkYearFilter = (year) => {
    if (selectedYear === "전체") return true;
    if (selectedYear === "1970년대") return year >= 1970 && year < 1980;
    if (selectedYear === "1990년대") return year >= 1990 && year < 2000;
    if (selectedYear === "2000년대") return year >= 2000 && year < 2010;
    if (selectedYear === "2010년대") return year >= 2010 && year < 2020;
    if (selectedYear === "2020년대") return year >= 2020 && year < 2030;
    return true;
  };

  if (loading || !selectedRegion) {
    return <div className="loading">실거래가 데이터를 불러오는 중...</div>;
  }

  const filteredApartments = selectedRegion.apartments.filter((apt) => {
    return checkAreaFilter(apt.rawArea) && checkYearFilter(apt.year);
  });

  const maxChartValue = Math.max(...selectedRegion.chart);

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div>
            <h1>Home Insight</h1>
            <p>부동산 가격 분석 플랫폼</p>
          </div>
        </div>

        <nav className="menu">
          <span className="active">매매/전·월세</span>
          <span>신축분양</span>
          <span>인구흐름</span>
        </nav>
      </header>

      <main className="map-container">
        <div id="kakao-map" className="kakao-map"></div>

        <section className="left-panel">
          <div className="panel-title">
            <h2>실거래가 검색</h2>
            <p>공공데이터 기반 아파트 실거래가입니다.</p>
          </div>

          <div className="search-row">
            <input
              type="text"
              placeholder="예: 강남구, 송파구, 서초구"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            <button className="search-btn" onClick={handleSearch}>
              검색
            </button>
          </div>

          <div className="filters">
            <div className="filter-wrap">
              <button onClick={() => setOpenFilter(openFilter === "month" ? null : "month")}>
                계약월 <span>▼</span>
              </button>

              {openFilter === "month" && (
                <div className="dropdown">
                  {dealMonthOptions.map((month) => (
                    <button
                      key={month}
                      onClick={() => {
                        setSelectedDealYmd(month);
                        setOpenFilter(null);
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-wrap">
              <button onClick={() => setOpenFilter(openFilter === "area" ? null : "area")}>
                면적 <span>▼</span>
              </button>

              {openFilter === "area" && (
                <div className="dropdown">
                  {areaOptions.map((area) => (
                    <button
                      key={area}
                      onClick={() => {
                        setSelectedArea(area);
                        setOpenFilter(null);
                      }}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-wrap">
              <button onClick={() => setOpenFilter(openFilter === "year" ? null : "year")}>
                준공년도 <span>▼</span>
              </button>

              {openFilter === "year" && (
                <div className="dropdown">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setOpenFilter(null);
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section-heading">
            <h3>지역 목록</h3>
            <span>{regionData.length}개 지역</span>
          </div>

          <div className="region-list">
            {regionData.map((region) => (
              <button
                key={region.id}
                className={selectedRegion.id === region.id ? "region-item selected" : "region-item"}
                onClick={() => handleSelectRegion(region)}
              >
                <div>
                  <span>{region.name}</span>
                  <p>거래량 {region.count}건</p>
                </div>
                <strong>{region.price}</strong>
              </button>
            ))}
          </div>

          <div className="section-heading">
            <h3>아파트 목록</h3>
            <span>{filteredApartments.length}개</span>
          </div>

          <div className="apartment-list">
            {filteredApartments.length > 0 ? (
              filteredApartments.map((apt, index) => (
                <button
                  className={
                    selectedApartment?.name === apt.name
                      ? "apartment-card active-apt"
                      : "apartment-card"
                  }
                  key={index}
                  onClick={() => setSelectedApartment(apt)}
                >
                  <div className="apt-top">
                    <strong>{apt.name}</strong>
                    <em>{apt.price}</em>
                  </div>
                  <p>
                    {apt.dong} · {apt.area} · {apt.year}년 준공 · {apt.floor}
                  </p>
                  <span>{apt.dealDate} 거래</span>
                </button>
              ))
            ) : (
              <div className="empty-result">조건에 맞는 아파트가 없습니다.</div>
            )}
          </div>
        </section>

        <aside className="detail-panel">
          <div className="detail-label">
            {selectedApartment ? "아파트 상세정보" : "지역 통계"}
          </div>

          <h2>{selectedApartment ? selectedApartment.name : selectedRegion.name}</h2>

          {selectedApartment ? (
            <>
              <p className="main-price">최근 거래가 {selectedApartment.price}</p>

              <div className="info-box">
                <p>전용면적</p>
                <strong>{selectedApartment.area}</strong>
              </div>

              <div className="info-row">
                <div>
                  <p>준공년도</p>
                  <strong>{selectedApartment.year}년</strong>
                </div>
                <div>
                  <p>거래층</p>
                  <strong>{selectedApartment.floor}</strong>
                </div>
              </div>

              <button className="back-region-btn" onClick={() => setSelectedApartment(null)}>
                지역 통계로 돌아가기
              </button>
            </>
          ) : (
            <>
              <p className="main-price">평균 매매가 {selectedRegion.price}</p>

              <div className="chart-box">
                {selectedRegion.chart.map((value, index) => (
                  <div
                    key={index}
                    style={{ height: `${(value / maxChartValue) * 100}%` }}
                  >
                    <strong>{value}억</strong>
                    <span>{2023 + index}</span>
                  </div>
                ))}
              </div>

              <div className="info-box">
                <p>거래량</p>
                <strong>{selectedRegion.count}건</strong>
              </div>

              <div className="info-row">
                <div>
                  <p>최고가</p>
                  <strong>{selectedRegion.max}</strong>
                </div>
                <div>
                  <p>최저가</p>
                  <strong>{selectedRegion.min}</strong>
                </div>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;