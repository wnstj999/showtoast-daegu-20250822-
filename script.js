// 더미 데이터
const dataset = [
    {
      title: "나쁜짬뽕",
      address: "경북 경산시 계양로35길 13",
      url: "https://naver.me/IIZSbxES",
      category: "중식",
      img: "./nazzam.jpg"
    }, 
    {
      title: "푸른영대식당", 
      address: "경북 경산시 갑제길 18",
      url: "https://naver.me/Fk5Lh2CM",
      category: "한식",
      img: "./puyoung.jpg"
    },
    {
      title: "카츠디나인",
      address: "경북 경산시 청운로 5",
      url: "https://naver.me/F0KwVPcu",
      category: "일식",
      img: "./D9.jpg"
    }
];

let map, geocoder;
let markers = [];
let overlays = [];
let currentInfoPanel = null;
let wasInfoPanelOpen = false; // 상세보기가 열려있었는지 기억하는 변수

// DOM 요소들
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const mapCategorySection = document.getElementById('mapCategorySection');
const resultsList = document.getElementById('resultsList');
const resultsHeader = document.getElementById('resultsHeader');
const infoPanel = document.getElementById('infoPanel');
const infoPanelClose = document.getElementById('infoPanelClose');

// 초기화
document.addEventListener('DOMContentLoaded', function () {
    initMap();
    initEventListeners();
    displayResults(dataset);
    setMapMarkers(dataset);
});

// 지도 초기화
function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(35.83, 128.75),
        level: 5
    };

    map = new kakao.maps.Map(container, options);
    geocoder = new kakao.maps.services.Geocoder();

    // 지도 컨트롤 추가
    const mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 지도 클릭 시 패널 닫기
    kakao.maps.event.addListener(map, 'click', function () {
        hideInfoPanel();
        clearActiveCard();
    });
}

// 이벤트 리스너 초기화
function initEventListeners() {
    // 사이드바 토글
    toggleBtn.addEventListener('click', function () {
        const isInfoPanelOpen = infoPanel.classList.contains('show');

        sidebar.classList.toggle('collapsed');
        const icon = toggleBtn.querySelector('i');

        // 카테고리 메뉴 위치 조정
        const categorySection = document.getElementById('mapCategorySection');

        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
            categorySection.style.left = '80px'; // 아이콘 메뉴 너비 + 여백

            // 상세보기가 열려있으면 기억하고 함께 접기
            if (isInfoPanelOpen) {
                wasInfoPanelOpen = true;
                infoPanel.classList.add('collapsed');
                infoPanel.classList.remove('show');

                // 토글 버튼을 사이드바로 이동 (접힌 상태에서도 보이도록)
                toggleBtn.classList.remove('on-info-panel');
                sidebar.appendChild(toggleBtn);
            }
        } else {
            icon.className = 'fas fa-chevron-left';
            categorySection.style.left = '420px'; // 아이콘 메뉴 + 사이드바 너비 + 여백

            // 이전에 상세보기가 열려있었다면 함께 복구
            if (wasInfoPanelOpen && currentInfoPanel) {
                infoPanel.style.left = '410px';
                infoPanel.classList.remove('collapsed');
                infoPanel.classList.add('show');

                // 토글 버튼을 다시 상세보기로 이동
                toggleBtn.classList.add('on-info-panel');
                infoPanel.appendChild(toggleBtn);

                wasInfoPanelOpen = false;
            }
            // 현재 상세보기가 열려있다면 위치만 조정 (사이드바 접힌 상태에서 펼칠 때)
            else if (isInfoPanelOpen) {
                infoPanel.style.left = '410px';
            }
        }
    });

    // 지도 위 카테고리 필터
    mapCategorySection.addEventListener('click', function (e) {
        if (e.target.classList.contains('map-category-btn')) {
            // 활성 카테고리 변경
            document.querySelectorAll('.map-category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            // 필터링
            const selectedCategory = e.target.dataset.category;
            filterResults(selectedCategory);
        }
    });

    // 정보 패널 닫기
    infoPanelClose.addEventListener('click', function () {
        wasInfoPanelOpen = false; // X 버튼으로 닫는 경우는 복구하지 않음
        currentInfoPanel = null;
        hideInfoPanel();
        clearActiveCard();
    });
}

// 결과 표시
function displayResults(data) {
    resultsList.innerHTML = '';

    if (data.length === 0) {
        resultsList.innerHTML = '<div class="loading">검색 결과가 없습니다.</div>';
        return;
    }

    resultsHeader.textContent = `맛집 목록 (${data.length}개)`;

    data.forEach((item, index) => {
        const card = createResultCard(item, index);
        resultsList.appendChild(card);
    });
}

// 결과 카드 생성
function createResultCard(item, index) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.dataset.index = index;

    card.innerHTML = `
        <img class="card-image" src="${item.img}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
        <div class="card-content">
          <div class="card-title">${item.title}</div>
          <div class="card-address">${item.address}</div>
          <div class="card-meta">
            <span class="card-category">${item.category}</span>
            <a href="${item.url}" class="card-link" target="_blank" onclick="event.stopPropagation()">
              상세보기 <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>
      `;

    // 카드 클릭 이벤트
    card.addEventListener('click', function () {
        selectCard(card, item, index);
    });

    return card;
}

// 카드 선택
function selectCard(card, item, index) {
    // 기존 활성 카드 제거
    clearActiveCard();

    // 새 카드 활성화
    card.classList.add('active');

    // 지도 이동 및 오버레이 표시
    if (markers[index]) {
        map.panTo(markers[index].getPosition());
        showOverlay(index);
        showInfoPanel(item);
    }
}

// 활성 카드 제거
function clearActiveCard() {
    document.querySelectorAll('.result-card').forEach(card => {
        card.classList.remove('active');
    });
}

// 지도 마커 설정
async function setMapMarkers(data) {
    // 기존 마커/오버레이 제거
    clearMarkers();

    for (let i = 0; i < data.length; i++) {
        try {
            const coords = await getCoordsByAddress(data[i].address);

            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: coords,
                map: map
            });

            // 커스텀 오버레이 생성
            const overlay = new kakao.maps.CustomOverlay({
                position: coords,
                content: `<div class="custom-overlay">${data[i].title}</div>`,
                yAnchor: 1.3
            });

            markers.push(marker);
            overlays.push(overlay);

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', function () {
                selectMarker(i, data[i]);
            });

        } catch (error) {
            console.error('주소 변환 실패:', data[i].address);
        }
    }
}

// 마커 선택
function selectMarker(index, item) {
    // 해당 카드 활성화
    const cards = document.querySelectorAll('.result-card');
    if (cards[index]) {
        clearActiveCard();
        cards[index].classList.add('active');
        cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 오버레이 표시 및 정보 패널 열기
    showOverlay(index);
    showInfoPanel(item);
}

// 오버레이 표시
function showOverlay(index) {
    // 모든 오버레이 숨기기
    overlays.forEach(overlay => overlay.setMap(null));

    // 선택된 오버레이만 표시
    if (overlays[index]) {
        overlays[index].setMap(map);
    }
}

// 정보 패널 표시
function showInfoPanel(item) {
    document.getElementById('infoPanelImage').src = item.img;
    document.getElementById('infoPanelTitle').textContent = item.title;
    document.getElementById('infoPanelAddress').textContent = item.address;
    document.getElementById('infoPanelLink').href = item.url;

    // 사이드바 상태에 따라 위치 조정
    const infoPanel = document.getElementById('infoPanel');
    if (sidebar.classList.contains('collapsed')) {
        infoPanel.style.left = '20px'; // 아이콘 메뉴 너비 + 여백
    } else {
        infoPanel.style.left = '420px'; // 아이콘 메뉴 + 사이드바 너비 - 여백 줄임
    }

    infoPanel.classList.add('show');
    infoPanel.classList.remove('collapsed');

    // 토글 버튼을 상세보기 패널에 붙이기
    toggleBtn.classList.add('on-info-panel');
    // 토글 버튼을 상세보기 패널의 자식으로 이동
    infoPanel.appendChild(toggleBtn);

    currentInfoPanel = item;
}

// 정보 패널 숨기기
function hideInfoPanel() {
    infoPanel.classList.remove('show');
    infoPanel.classList.remove('collapsed');

    // 토글 버튼을 사이드바로 다시 이동
    toggleBtn.classList.remove('on-info-panel');
    sidebar.appendChild(toggleBtn);

    overlays.forEach(overlay => overlay.setMap(null));

    // X 버튼으로 닫는 경우에만 currentInfoPanel을 null로 설정
    if (!wasInfoPanelOpen) {
        currentInfoPanel = null;
    }
}

// 카테고리 필터링
function filterResults(category) {
    let filteredData = dataset;

    if (category !== '전체') {
        filteredData = dataset.filter(item => item.category === category);
    }

    displayResults(filteredData);
    setMapMarkers(filteredData);
    hideInfoPanel();
    clearActiveCard();
}

// 마커 제거
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    overlays.forEach(overlay => overlay.setMap(null));
    markers = [];
    overlays = [];
}

// 주소를 좌표로 변환
function getCoordsByAddress(address) {
    return new Promise((resolve, reject) => {
        geocoder.addressSearch(address, function (result, status) {
            if (status === kakao.maps.services.Status.OK) {
                const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                resolve(coords);
            } else {
                reject(new Error('주소 변환 실패: ' + address));
            }
        });
    });
}