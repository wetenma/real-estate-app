import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const regionPosition = {
  강남구: { lat: 37.5172, lng: 127.0473 },
  서초구: { lat: 37.4837, lng: 127.0324 },
  송파구: { lat: 37.5145, lng: 127.1059 },
  마포구: { lat: 37.5663, lng: 126.9019 },
  용산구: { lat: 37.5326, lng: 126.99 },
  성동구: { lat: 37.5633, lng: 127.0369 },
  강동구: { lat: 37.5301, lng: 127.1238 },
  영등포구: { lat: 37.5264, lng: 126.8962 },
  양천구: { lat: 37.5169, lng: 126.8664 },
  노원구: { lat: 37.6542, lng: 127.0568 },
  분당구: { lat: 37.3828, lng: 127.1189 },
  수원시: { lat: 37.2636, lng: 127.0286 },
  용인시: { lat: 37.2411, lng: 127.1776 },
  고양시: { lat: 37.6584, lng: 126.832 },
  성남시: { lat: 37.42, lng: 127.1265 },
  화성시: { lat: 37.1995, lng: 126.8312 },
  남양주시: { lat: 37.636, lng: 127.2165 },
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

function formatApt(apt) {
  return {
    id: apt.id,
    name: apt.apt_name,
    area: `${Number(apt.area).toFixed(2)}㎡`,
    rawArea: Number(apt.area),
    year: Number(apt.build_year),
    price: `${(Number(apt.deal_amount) / 10000).toFixed(1)}억`,
    dealAmount: Number(apt.deal_amount),
    floor: `${apt.floor}층`,
    dong: apt.dong,
    dealDate: `${apt.deal_year}.${apt.deal_month}.${apt.deal_day}`,
    lat: apt.lat ? Number(apt.lat) : null,
    lng: apt.lng ? Number(apt.lng) : null,
  };
}

function App() {
  const [viewLevel, setViewLevel] = useState("region");
  const [regionData, setRegionData] = useState([]);
  const [dongData, setDongData] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDong, setSelectedDong] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedArea, setSelectedArea] = useState("전체");
  const [selectedYear, setSelectedYear] = useState("전체");
  const [selectedDealYmd, setSelectedDealYmd] = useState("202405");
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const mapRef = useRef(null);
  const regionOverlayRefs = useRef([]);
  const dongOverlayRefs = useRef([]);
  const apartmentOverlayRefs = useRef([]);

  const selectedRegionRef = useRef(null);
  const selectedDongRef = useRef(null);

  const areaOptions = ["전체", "59㎡", "76㎡", "84㎡", "101㎡"];
  const yearOptions = ["전체", "1970년대", "1990년대", "2000년대", "2010년대", "2020년대"];
  const dealMonthOptions = ["202405", "202404", "202403", "202402", "202401", "202312"];

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
  }, [selectedRegion]);

  useEffect(() => {
    selectedDongRef.current = selectedDong;
  }, [selectedDong]);

  useEffect(() => {
    setLoading(true);
    setViewLevel("region");
    setSelectedDong(null);
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
            avgPrice: region.avgPrice,
            lat: pos.lat,
            lng: pos.lng,
          };
        });

        setRegionData(converted);
        setSelectedRegion(converted[0] || null);
        setSearchText(converted[0]?.name || "");
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        alert("실거래가 데이터를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, [selectedDealYmd]);

  useEffect(() => {
    if (!selectedRegion) return;

    fetch(
      `http://localhost:4000/api/db/apartments?regionName=${encodeURIComponent(
        selectedRegion.name
      )}&dealYmd=${selectedDealYmd}`
    )
      .then((res) => res.json())
      .then((data) => setApartments(data.map(formatApt)))
      .catch(() => setApartments([]));

    fetch(
      `http://localhost:4000/api/db/dongs?regionName=${encodeURIComponent(
        selectedRegion.name
      )}&dealYmd=${selectedDealYmd}`
    )
      .then((res) => res.json())
      .then((data) => setDongData(data))
      .catch(() => setDongData([]));

    fetch(
      `http://localhost:4000/api/db/region-trend?regionName=${encodeURIComponent(
        selectedRegion.name
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setTrendData(
          data.map((item) => ({
            label: `${String(item.dealYmd).slice(0, 4)}.${String(item.dealYmd).slice(4, 6)}`,
            value: Number((item.avgPrice / 10000).toFixed(1)),
          }))
        );
      })
      .catch(() => setTrendData([]));
  }, [selectedRegion, selectedDealYmd]);

  useEffect(() => {
    if (!window.kakao || regionData.length === 0) return;

    window.kakao.maps.load(() => {
      const container = document.getElementById("kakao-map");

      const map = new window.kakao.maps.Map(container, {
        center: new window.kakao.maps.LatLng(37.4979, 127.0276),
        level: 9,
      });

      mapRef.current = map;

      window.kakao.maps.event.addListener(map, "zoom_changed", () => {
        const level = map.getLevel();

        if (level >= 8) {
          setViewLevel("region");
          setSelectedDong(null);
          setSelectedApartment(null);
          return;
        }

        if (level >= 5) {
          if (selectedRegionRef.current) {
            setViewLevel("dong");
            setSelectedDong(null);
            setSelectedApartment(null);
          }
          return;
        }

        if (level <= 4 && selectedDongRef.current) {
          setViewLevel("apartment");
        }
      });

      drawRegionMarkers();
    });
  }, [regionData]);

  useEffect(() => {
    if (!mapRef.current) return;

    clearRegionMarkers();
    clearDongMarkers();
    clearApartmentMarkers();

    if (viewLevel === "region") drawRegionMarkers();
    if (viewLevel === "dong") drawDongMarkers();
    if (viewLevel === "apartment") drawApartmentMarkers();
  }, [viewLevel, regionData, dongData, apartments, selectedDong]);

  const suggestions = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) return [];

    const regionSuggestions = regionData
      .filter((region) => region.name.includes(keyword))
      .map((region) => ({ type: "지역", label: region.name, data: region }));

    const dongSuggestions = dongData
      .filter((dong) => dong.dong.includes(keyword))
      .map((dong) => ({ type: "동", label: dong.dong, data: dong }));

    const aptSuggestions = apartments
      .filter((apt) => apt.name.includes(keyword))
      .slice(0, 8)
      .map((apt) => ({ type: "아파트", label: apt.name, data: apt }));

    return [...regionSuggestions, ...dongSuggestions, ...aptSuggestions].slice(0, 10);
  }, [searchText, regionData, dongData, apartments]);

  const clearRegionMarkers = () => {
    regionOverlayRefs.current.forEach((marker) => marker.overlay.setMap(null));
    regionOverlayRefs.current = [];
  };

  const clearDongMarkers = () => {
    dongOverlayRefs.current.forEach((overlay) => overlay.setMap(null));
    dongOverlayRefs.current = [];
  };

  const clearApartmentMarkers = () => {
    apartmentOverlayRefs.current.forEach((overlay) => overlay.setMap(null));
    apartmentOverlayRefs.current = [];
  };

  const moveMap = (lat, lng, level) => {
    if (!mapRef.current || !window.kakao || !lat || !lng) return;
    mapRef.current.setLevel(level);
    mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng));
  };

  const drawRegionMarkers = () => {
    if (!mapRef.current || !window.kakao) return;

    regionData.forEach((region) => {
      const position = new window.kakao.maps.LatLng(region.lat, region.lng);
      const markerEl = document.createElement("button");
      markerEl.className = "map-marker region-marker";
      markerEl.innerHTML = `
        <span>${region.name}</span>
        <strong>${region.price}</strong>
        <small>최고 ${region.max} · 최저 ${region.min}</small>
      `;

      markerEl.addEventListener("click", () => {
        setSelectedRegion(region);
        setSearchText(region.name);
        setSelectedDong(null);
        setSelectedApartment(null);
        setViewLevel("dong");
        moveMap(region.lat, region.lng, 6);
      });

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: markerEl,
        yAnchor: 1,
      });

      overlay.setMap(mapRef.current);
      regionOverlayRefs.current.push({ overlay, element: markerEl });
    });
  };

  const drawDongMarkers = () => {
    if (!mapRef.current || !window.kakao) return;

    dongData
      .filter((dong) => dong.lat && dong.lng)
      .forEach((dong) => {
        const position = new window.kakao.maps.LatLng(dong.lat, dong.lng);
        const markerEl = document.createElement("button");
        markerEl.className = "dong-map-marker";
        markerEl.innerHTML = `
          <span>${dong.dong}</span>
          <strong>${dong.avgPriceText}</strong>
          <small>최고 ${dong.maxPriceText} · 최저 ${dong.minPriceText}</small>
        `;

        markerEl.addEventListener("click", () => {
          setSelectedDong(dong);
          setSelectedApartment(null);
          setViewLevel("apartment");
          moveMap(dong.lat, dong.lng, 4);
        });

        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content: markerEl,
          yAnchor: 1,
        });

        overlay.setMap(mapRef.current);
        dongOverlayRefs.current.push(overlay);
      });
  };

  const drawApartmentMarkers = () => {
    if (!mapRef.current || !window.kakao || !selectedDong) return;

    const targetApartments = apartments.filter(
      (apt) => apt.dong === selectedDong.dong && apt.lat && apt.lng
    );

    targetApartments.forEach((apt) => {
      const position = new window.kakao.maps.LatLng(apt.lat, apt.lng);
      const markerEl = document.createElement("button");
      markerEl.className = "apt-card-marker";
      markerEl.innerHTML = `
        <div class="marker-head">${apt.dong}</div>
        <div class="marker-title">${apt.name}</div>
        <div class="marker-price">${apt.price}</div>
        <div class="marker-desc">${apt.area} · ${apt.floor}</div>
      `;

      markerEl.addEventListener("click", () => {
        setSelectedApartment(apt);
        moveMap(apt.lat, apt.lng, 3);
      });

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: markerEl,
        yAnchor: 1,
      });

      overlay.setMap(mapRef.current);
      apartmentOverlayRefs.current.push(overlay);
    });
  };

  const selectSuggestion = (suggestion) => {
    setShowSuggestions(false);
    setSearchText(suggestion.label);

    if (suggestion.type === "지역") {
      setSelectedRegion(suggestion.data);
      setSelectedDong(null);
      setSelectedApartment(null);
      setViewLevel("dong");
      moveMap(suggestion.data.lat, suggestion.data.lng, 6);
    }

    if (suggestion.type === "동") {
      setSelectedDong(suggestion.data);
      setSelectedApartment(null);
      setViewLevel("apartment");
      moveMap(suggestion.data.lat, suggestion.data.lng, 4);
    }

    if (suggestion.type === "아파트") {
      const apt = suggestion.data;
      const dong = dongData.find((item) => item.dong === apt.dong);

      if (dong) setSelectedDong(dong);

      setSelectedApartment(apt);
      setViewLevel("apartment");
      moveMap(apt.lat, apt.lng, 3);
    }
  };

  const handleSearch = () => {
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }

    alert("검색 결과가 없습니다.");
  };

  const goRegionLevel = () => {
    setViewLevel("region");
    setSelectedDong(null);
    setSelectedApartment(null);
    if (selectedRegion) moveMap(selectedRegion.lat, selectedRegion.lng, 9);
  };

  const goDongLevel = () => {
    setViewLevel("dong");
    setSelectedApartment(null);
    if (selectedRegion) moveMap(selectedRegion.lat, selectedRegion.lng, 6);
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

  const filteredApartments = apartments.filter((apt) => {
    const dongMatched =
      viewLevel !== "apartment" || !selectedDong || apt.dong === selectedDong.dong;

    return dongMatched && checkAreaFilter(apt.rawArea) && checkYearFilter(apt.year);
  });

  const maxChartValue =
    trendData.length > 0 ? Math.max(...trendData.map((item) => item.value)) : 1;

  return (
    <div className="app">
      <header className="navbar">
  <div className="brand">
    <div className="brand-icon">K</div>

    <div className="brand-text">
      <h1>Kim Soohyeon</h1>
      <p>부동산 가격 분석 플랫폼</p>
    </div>
  </div>

  <nav className="menu">
    <span className="active">매매/전·월세</span>
  </nav>
</header>

      <main className="map-container">
        <div id="kakao-map" className="kakao-map"></div>

       

        <div className="breadcrumb">
          <button onClick={goRegionLevel}>전체 지역</button>
          {selectedRegion && <button onClick={goDongLevel}>{selectedRegion.name}</button>}
          {selectedDong && <button>{selectedDong.dong}</button>}
        </div>
        {showLeftPanel && (
        <section className="left-panel">
          <div className="panel-title panel-title-row">
            <div>
             <h2>실거래가 검색</h2>
              <p>공공데이터 기반 아파트 실거래가입니다.</p>
           </div>

            <button
               className="inner-close-btn"
             onClick={() => setShowLeftPanel(false)}
           >
             −
            </button>
          </div>

          <div className="search-row search-wrap">
            <input
              type="text"
              placeholder="예: 강남구, 대치동, 은마"
              value={searchText}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              검색
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestion-box">
                {suggestions.map((item, index) => (
                  <button key={`${item.type}-${item.label}-${index}`} onClick={() => selectSuggestion(item)}>
                    <span>{item.type}</span>
                    <strong>{item.label}</strong>
                  </button>
                ))}
              </div>
            )}
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
            <h3>{viewLevel === "region" ? "지역 목록" : viewLevel === "dong" ? "동 목록" : "아파트 목록"}</h3>
            <span>
              {viewLevel === "region"
                ? `${regionData.length}개 지역`
                : viewLevel === "dong"
                ? `${dongData.length}개 동`
                : `${filteredApartments.length}개`}
            </span>
          </div>

          {viewLevel === "region" && (
            <div className="region-list">
              {regionData.map((region) => (
                <button
                  key={region.id}
                  className="region-item"
                  onClick={() => {
                    setSelectedRegion(region);
                    setSelectedDong(null);
                    setSelectedApartment(null);
                    setViewLevel("dong");
                    moveMap(region.lat, region.lng, 6);
                  }}
                >
                  <div>
                    <span>{region.name}</span>
                    <p>거래량 {region.count}건 · 최고 {region.max} · 최저 {region.min}</p>
                  </div>
                  <strong>{region.price}</strong>
                </button>
              ))}
            </div>
          )}

          {viewLevel === "dong" && (
            <div className="region-list">
              {dongData.map((dong) => (
                <button
                  key={dong.dong}
                  className="region-item"
                  onClick={() => {
                    setSelectedDong(dong);
                    setSelectedApartment(null);
                    setViewLevel("apartment");
                    moveMap(dong.lat, dong.lng, 4);
                  }}
                >
                  <div>
                    <span>{dong.dong}</span>
                    <p>거래량 {dong.count}건 · 최고 {dong.maxPriceText} · 최저 {dong.minPriceText}</p>
                  </div>
                  <strong>{dong.avgPriceText}</strong>
                </button>
              ))}
            </div>
          )}

          {viewLevel === "apartment" && (
            <div className="apartment-list">
              {filteredApartments.map((apt) => (
                <button
                  className={selectedApartment?.id === apt.id ? "apartment-card active-apt" : "apartment-card"}
                  key={apt.id}
                  onClick={() => {
                    setSelectedApartment(apt);
                    moveMap(apt.lat, apt.lng, 3);
                  }}
                >
                  <div className="apt-top">
                    <strong>{apt.name}</strong>
                    <em>{apt.price}</em>
                  </div>
                  <p>{apt.dong} · {apt.area} · {apt.year}년 준공 · {apt.floor}</p>
                  <span>{apt.dealDate} 거래</span>
                </button>
              ))}
            </div>
          )}
        </section>
        )}

        {!showLeftPanel && (
         <button
            className="open-panel-btn open-left-panel"
           onClick={() => setShowLeftPanel(true)}
         >
           실거래가 검색 열기
          </button>
        )}


        {showRightPanel && (
        <aside className="detail-panel">
          <div className="detail-header-row">
  <div className="detail-label">
    {selectedApartment ? "아파트 상세정보" : selectedDong ? "동 통계" : "지역 통계"}
  </div>

  <button
    className="inner-close-btn"
    onClick={() => setShowRightPanel(false)}
  >
    −
  </button>
</div>

          <h2>
            {selectedApartment
              ? selectedApartment.name
              : selectedDong
              ? `${selectedRegion.name} ${selectedDong.dong}`
              : selectedRegion.name}
          </h2>

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
            </>
          ) : selectedDong ? (
            <>
              <p className="main-price">평균 매매가 {selectedDong.avgPriceText}</p>
              <div className="info-row">
                <div>
                  <p>최고가</p>
                  <strong>{selectedDong.maxPriceText}</strong>
                </div>
                <div>
                  <p>최저가</p>
                  <strong>{selectedDong.minPriceText}</strong>
                </div>
              </div>
              <div className="info-box">
                <p>거래량</p>
                <strong>{selectedDong.count}건</strong>
              </div>
            </>
          ) : (
            <>
              <p className="main-price">평균 매매가 {selectedRegion.price}</p>
              <div className="chart-box">
                {trendData.length > 0 ? (
                  trendData.map((item) => (
                    <div key={item.label} style={{ height: `${(item.value / maxChartValue) * 100}%` }}>
                      <strong>{item.value}억</strong>
                      <span>{item.label}</span>
                    </div>
                  ))
                ) : (
                  <p>가격 추이 데이터가 없습니다.</p>
                )}
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
        )}

{!showRightPanel && (
  <button
    className="open-panel-btn open-right-panel"
    onClick={() => setShowRightPanel(true)}
  >
    지역통계 열기
  </button>
)}

      </main>
    </div>
  );
}

export default App;