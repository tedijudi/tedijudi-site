// Orbit Carousel TODAY PICK
// Cloudinary(클라우디너리) + Netlify Functions 연동 버전
// endpoint: /.netlify/functions/cloudinary-random

// --------------------------------------
// 0. DOM 참조
// --------------------------------------
const stage = document.getElementById("stage");
const statusEl = document.getElementById("status");

const viewer = document.getElementById("viewer");
const viewerBg = document.getElementById("viewerBg");
const viewerCard = document.getElementById("viewerCard");
const viewerTitle = document.getElementById("viewerTitle");
const viewerMeta = document.getElementById("viewerMeta");
const viewerDesc = document.getElementById("viewerDesc");
const viewerClose = document.getElementById("viewerClose");

// --------------------------------------
// 1. 기본 샘플 데이터 (Cloudinary 실패 시 사용)
// --------------------------------------
const fallbackPhotos = [
  {
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=80",
    title: "sample 1 · fallback",
    date: "",
    description: "샘플 이미지 1입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    title: "sample 2 · fallback",
    date: "",
    description: "샘플 이미지 2입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=900&q=80",
    title: "sample 3 · fallback",
    date: "",
    description: "샘플 이미지 3입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=900&q=80",
    title: "sample 4 · fallback",
    date: "",
    description: "샘플 이미지 4입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=900&q=80",
    title: "sample 5 · fallback",
    date: "",
    description: "샘플 이미지 5입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80",
    title: "sample 6 · fallback",
    date: "",
    description: "샘플 이미지 6입니다.",
  },
  {
    url: "https://images.unsplash.com/photo-1549887534-3db1bd59dcca?auto=format&fit=crop&w=900&q=80",
    title: "sample 7 · fallback",
    date: "",
    description: "샘플 이미지 7입니다.",
  },
];

let photos = [...fallbackPhotos]; // 실제 사용 데이터
let cardEls = [];                 // DOM 카드 리스트
let baseRotation = 0;             // 전체 회전 각도(도 단위)
let frontIndex = 0;               // 정면 카드 인덱스

// --------------------------------------
// 2. 카드 만들기
// --------------------------------------
function buildCards() {
  if (!stage) return;

  stage.innerHTML = "";
  cardEls = photos.map((photo, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.backgroundImage = `url(${photo.url})`;
    card.dataset.index = String(index);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = photo.title || `photo #${index + 1}`;
    card.appendChild(label);

    // 카드 클릭 → 확대 뷰어
    card.addEventListener("click", () => {
      openViewer(index);
    });

    stage.appendChild(card);
    return card;
  });

  layoutCards();
}

// --------------------------------------
// 3. 카드 레이아웃 (3D 궤도)
// --------------------------------------
function layoutCards() {
  if (!cardEls.length) return;

  const n = cardEls.length;
  const step = 360 / n;
  const radius = 520; // 궤도 반지름

  let bestFrontIndex = 0;
  let bestFrontScore = -Infinity;

  cardEls.forEach((card, i) => {
    const angle = baseRotation + step * i; // 도 단위
    const rad = (angle * Math.PI) / 180;

    const x = Math.sin(rad) * radius;
    const z = Math.cos(rad) * radius;
    const depth = (Math.cos(rad) + 1) / 2; // 0 ~ 1 (뒤→앞)

    const scale = 0.65 + depth * 0.4;     // 앞에 올수록 커짐
    const y = 40 - depth * 40;            // 살짝 아치형
    const opacity = 0.25 + depth * 0.75;  // 뒤쪽은 살짝 투명

    const transform = `
      translate(-50%, -50%)
      translate3d(${x}px, ${y}px, ${z}px)
      rotateY(${angle}deg)
      scale(${scale})
    `;

    card.style.transform = transform;
    card.style.zIndex = String(100 + Math.round(depth * 100));
    card.style.opacity = opacity.toFixed(2);

    // 정면 카드 찾기 (z가 가장 큰 카드)
    if (depth > bestFrontScore) {
      bestFrontScore = depth;
      bestFrontIndex = i;
    }
  });

  frontIndex = bestFrontIndex;

  cardEls.forEach((card, i) => {
    card.classList.toggle("front", i === frontIndex);
  });
}

// --------------------------------------
// 4. 드래그로 회전 (마우스 + 터치)
// --------------------------------------
let dragging = false;
let lastX = 0;
let velocityX = 0;
let inertiaId = null;

function stopInertia() {
  if (inertiaId !== null) {
    cancelAnimationFrame(inertiaId);
    inertiaId = null;
  }
}

function onDragStart(clientX) {
  dragging = true;
  lastX = clientX;
  velocityX = 0;
  stopInertia();
}

function onDragMove(clientX) {
  if (!dragging) return;
  const dx = clientX - lastX;
  lastX = clientX;

  baseRotation += dx * -0.25; // 좌우 반대로 회전
  velocityX = dx;
  layoutCards();
}

function onDragEnd() {
  if (!dragging) return;
  dragging = false;

  // 관성 효과
  let v = velocityX;
  function inertia() {
    v *= 0.94;
    if (Math.abs(v) < 0.1) {
      inertiaId = null;
      return;
    }
    baseRotation += v * -0.25;
    layoutCards();
    inertiaId = requestAnimationFrame(inertia);
  }
  inertia();
}

// stage 에 포인터 이벤트 연결
if (stage) {
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    onDragStart(e.clientX);
  });

  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onDragMove(e.clientX);
  });

  stage.addEventListener("pointerup", (e) => {
    stage.releasePointerCapture(e.pointerId);
    onDragEnd();
  });

  stage.addEventListener("pointercancel", onDragEnd);

  // 터치 이벤트 (모바일)
  stage.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      onDragStart(e.touches[0].clientX);
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchmove",
    (e) => {
      if (!e.touches[0]) return;
      onDragMove(e.touches[0].clientX);
    },
    { passive: true }
  );

  stage.addEventListener("touchend", onDragEnd);
}

// --------------------------------------
// 5. 확대 뷰어
// --------------------------------------
function openViewer(index) {
  const photo = photos[index];
  if (!photo || !viewer) return;

  viewerBg.style.backgroundImage = `url(${photo.url})`;
  viewerCard.style.backgroundImage = `url(${photo.url})`;
  viewerTitle.textContent = photo.title || `photo #${index + 1}`;
  viewerMeta.textContent = photo.date || "";
  viewerDesc.textContent =
    photo.description || "오늘의 사진입니다.";

  viewer.classList.add("active");
}

function closeViewer() {
  if (!viewer) return;
  viewer.classList.remove("active");
}

if (viewerClose) {
  viewerClose.addEventListener("click", closeViewer);
}
if (viewer) {
  viewer.addEventListener("click", (e) => {
    // 카드/텍스트 영역이 아닌 배경을 클릭했을 때만 닫기
    if (e.target === viewer || e.target === viewerBg) {
      closeViewer();
    }
  });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeViewer();
  }
});

// --------------------------------------
// 6. Cloudinary에서 사진 불러오기
// --------------------------------------
const FUNCTION_ENDPOINT = "/.netlify/functions/cloudinary-random";

async function loadFromCloudinary() {
  setStatus("Cloudinary에서 오늘의 사진 불러오는 중…");

  try {
    const res = await fetch(FUNCTION_ENDPOINT, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      setStatus("Cloudinary 폴더가 비어 있어 샘플 이미지로 표시 중");
      photos = [...fallbackPhotos];
      buildCards();
      return;
    }

    // Netlify function cloudinary-random.js 가
    // { items: [{ image, name, meta }, ...] } 형태로 리턴한다고 가정
    photos = items.map((item, i) => ({
      url: item.image,
      title: item.name || `my_love #${i + 1}`,
      date: item.meta || "",
      description: "우리 웨딩 사진 " + (i + 1) + "번째 추억입니다.",
    }));

    setStatus(`Cloudinary my_love 폴더에서 ${photos.length}장 불러옴`);
    buildCards();
  } catch (err) {
    console.error("Cloudinary load error:", err);
    setStatus("Cloudinary 오류로 샘플 이미지 사용 중");
    photos = [...fallbackPhotos];
    buildCards();
  }
}

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

// --------------------------------------
// 7. 초기 실행
// --------------------------------------
window.addEventListener("load", () => {
  // 1) 먼저 fallback 으로라도 궤도 보여주고
  photos = [...fallbackPhotos];
  buildCards();

  // 2) 백그라운드에서 Cloudinary 호출해서 교체
  loadFromCloudinary();
});
