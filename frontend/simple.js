/* 제철밥상 간편 화면 - AI Agent 시연용 프론트엔드 */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = { cart: "jecheol_cart_v3", memory: "jecheol_agent_memory_v3", receipt: "jecheol_receipt_v3" };

const catalog = [
  { id: "cabbage", name: "배추", display: "배추 1포기", price: 4800, category: "채소", unit: "1포기", change: -6.2, normal: -4.8, verdict: "지금 장보기 괜찮음", season: "가을" },
  { id: "radish", name: "무", display: "무 1개", price: 2100, category: "채소", unit: "1개", change: -3.8, normal: -8.1, verdict: "지금 사기 좋음", season: "가을" },
  { id: "onion", name: "양파", display: "양파 1kg", price: 3500, category: "채소", unit: "1kg", change: 1.7, normal: 2.4, verdict: "보통", season: "사계절" },
  { id: "zucchini", name: "애호박", display: "애호박 1개", price: 1800, category: "채소", unit: "1개", change: -2.2, normal: -1.1, verdict: "보통", season: "여름·가을" },
  { id: "spinach", name: "시금치", display: "시금치 1단", price: 2600, category: "채소", unit: "1단", change: 8.6, normal: 12.2, verdict: "조금 기다리기", season: "가을·겨울" },
  { id: "apple", name: "사과", display: "사과 1봉", price: 8900, category: "과일", unit: "1봉", change: -1.4, normal: -5.2, verdict: "보통", season: "가을" },
  { id: "pork", name: "돼지고기 앞다리살", display: "돼지고기 앞다리살 600g", price: 8900, category: "육류", unit: "600g", change: -3.1, normal: 3.4, verdict: "보통", season: "사계절" },
  { id: "beef", name: "소고기 국거리", display: "소고기 국거리 300g", price: 13900, category: "육류", unit: "300g", change: 4.6, normal: 9.1, verdict: "대체 고려", season: "사계절" },
  { id: "chicken", name: "닭고기", display: "닭고기 1마리", price: 7200, category: "육류", unit: "1마리", change: -2.8, normal: -1.7, verdict: "지금 장보기 괜찮음", season: "사계절" },
  { id: "mackerel", name: "고등어", display: "고등어 2마리", price: 6500, category: "수산물", unit: "2마리", change: -7.4, normal: -10.8, verdict: "지금 사기 좋음", season: "가을" },
  { id: "squid", name: "오징어", display: "오징어 2마리", price: 7900, category: "수산물", unit: "2마리", change: 2.1, normal: 5.7, verdict: "보통", season: "가을" },
  { id: "shrimp", name: "새우", display: "새우 300g", price: 9800, category: "수산물", unit: "300g", change: -4.2, normal: -2.5, verdict: "지금 장보기 괜찮음", season: "가을" },
  { id: "hairtail", name: "갈치", display: "갈치 1마리", price: 11800, category: "수산물", unit: "1마리", change: 6.4, normal: 8.8, verdict: "조금 기다리기", season: "가을·겨울" }
];

const barcodeMap = {
  "8800000000003": "pork",
  "8800000000004": "mackerel",
  "8800000000005": "squid",
  "8800000000006": "shrimp",
  "8800000000007": "cabbage",
  "8801234567890": "onion"
};

const dishCatalog = [
  { title: "배추된장국과 두부구이", ingredients: ["cabbage", "onion"], note: "따뜻하고 든든한 국물", mood: "따뜻한 국물" },
  { title: "고등어 구이와 제철 채소", ingredients: ["mackerel", "spinach", "onion"], note: "수산물 가격이 내려가는 흐름", mood: "든든한 단백질" },
  { title: "돼지고기 애호박 볶음", ingredients: ["pork", "zucchini", "onion"], note: "30분 안에 완성하는 한 접시", mood: "아이와 함께" },
  { title: "새우 채소 비빔밥", ingredients: ["shrimp", "spinach", "onion"], note: "가볍지만 단백질을 챙기는 메뉴", mood: "가벼운 한 끼" }
];

let cart = readJson(STORAGE.cart, []);
let memories = readJson(STORAGE.memory, []);
let receiptTotal = Number(localStorage.getItem(STORAGE.receipt) || 0);
let activeMarket = "photo";
let photoSelection = null;
let photoCandidates = [];
let lastPhotoFile = null;

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function won(value) { return `${Math.round(Number(value) || 0).toLocaleString("ko-KR")}원`; }
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch])); }
function itemById(id) { return catalog.find((item) => item.id === id); }
function itemByName(value) { return catalog.find((item) => value.includes(item.name) || item.name.includes(value)); }
function totalCart() { return cart.reduce((sum, item) => sum + item.price * item.qty, 0); }
function persist() { writeJson(STORAGE.cart, cart); renderCart(); updateMetrics(); }

function go(id) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  $$(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.go === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "instructor") renderInstructor();
  if (id === "cart") renderCart();
  if (id === "home") renderMessages();
}

$$('[data-go]').forEach((button) => button.addEventListener("click", () => go(button.dataset.go)));

function updateMetrics() {
  $("#metricTotal").textContent = won(totalCart());
  $("#cartBadge").textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  $("#metricMemory").textContent = `${memories.length}개`;
}

function renderMessages() {
  const box = $("#messages");
  if (!memories.length) {
    box.innerHTML = `<div class="message-bubble assistant"><span class="message-meta">제철밥상 AI Agent</span>안녕하세요. 가격 흐름을 근거로 오늘의 장보기를 함께 정리해볼게요.<br><strong>수산물 중 지금 사기 좋은 것은?</strong>처럼 물어보세요.</div>`;
    return;
  }
  box.innerHTML = memories.slice(-4).map((memory) => `<div class="message-bubble user"><span class="message-meta">나 · ${esc(memory.time)}</span>${esc(memory.question)}</div><div class="message-bubble assistant"><span class="message-meta">제철밥상 AI Agent · ${esc(memory.source || "근거 기반 답변")}</span>${esc(memory.answer).replace(/\n/g, "<br>")}</div>`).join("");
}

function markTrace(activeIndex) {
  $$("#agentSteps li").forEach((step, index) => { step.classList.toggle("active", index === activeIndex); step.classList.toggle("done", index < activeIndex); });
}

function findMentionedItems(question) {
  const found = catalog.filter((item) => question.includes(item.name) || question.includes(item.category) || question.includes(item.name.split(" ")[0]));
  if (found.length) return found.slice(0, 3);
  if (question.includes("수산") || question.includes("생선")) return catalog.filter((item) => item.category === "수산물").sort((a, b) => a.normal - b.normal).slice(0, 3);
  if (question.includes("육류") || question.includes("고기")) return catalog.filter((item) => item.category === "육류").sort((a, b) => a.normal - b.normal).slice(0, 3);
  return catalog.filter((item) => item.normal < 0).sort((a, b) => a.normal - b.normal).slice(0, 3);
}

function trendText(item) { return item.change < 0 ? `전주보다 ${Math.abs(item.change).toFixed(1)}% 내리는 흐름` : `전주보다 ${item.change.toFixed(1)}% 오르는 흐름`; }
function normalText(item) { return item.normal < 0 ? `평년보다 ${Math.abs(item.normal).toFixed(1)}% 낮음` : `평년보다 ${item.normal.toFixed(1)}% 높음`; }

function localAgent(question) {
  const items = findMentionedItems(question);
  const isAlternative = question.includes("대체") || question.includes("대신");
  const isMeal = question.includes("밥상") || question.includes("메뉴") || question.includes("먹을");
  if (isAlternative) {
    const target = items[0] || itemById("pork");
    const alternative = target.category === "육류" ? itemById("chicken") : target.category === "수산물" ? itemById("mackerel") : itemById("zucchini");
    return { text: `${target.display} 대신에는 ${alternative.display}을(를) 살펴보세요.\n${target.name}은 ${normalText(target)}이고, ${alternative.name}은 ${normalText(alternative)}라서 오늘 장보기 부담을 낮출 수 있습니다.`, items: [target, alternative], intent: "대체 재료 찾기" };
  }
  if (isMeal) {
    const dishes = dishCatalog.slice(0, 3);
    return { text: `오늘은 ${dishes[0].title}을 추천해요.\n${dishes[0].ingredients.map((id) => itemById(id).name).join("·")} 재료로 ${dishes[0].note}을 만들 수 있습니다. 가격이 부담되면 ${dishes[1].title}처럼 ${dishes[1].note} 메뉴로 바꿔도 좋아요.`, items: dishes[0].ingredients.map(itemById), intent: "밥상 추천" };
  }
  const lead = items[0];
  const list = items.map((item) => `${item.name} ${won(item.price)} (${item.verdict})`).join(", ");
  return { text: `${items.length > 1 ? items.map((item) => item.name).join(", ") : lead.name}을(를) 살펴봤어요.\n${list}\n${lead.name}은 ${trendText(lead)}이며 ${normalText(lead)}입니다. 오늘은 ${lead.verdict.toLowerCase()} 쪽으로 판단할 수 있어요.`, items, intent: "가격 판단" };
}

async function tryLiveAgent(question) {
  const base = String(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  if (!base || /localhost|127\.0\.0\.1/.test(base)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${base}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, use_tools: true }), signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.reply) return null;
    return { text: data.reply, items: findMentionedItems(question), intent: "백엔드 AI Agent", source: "실시간 API" };
  } catch { return null; } finally { clearTimeout(timeout); }
}

function renderEvidence(items, source) {
  $("#evidenceStatus").textContent = `${items.length}개 근거 확인`;
  $("#evidenceList").innerHTML = items.map((item) => `<div class="evidence-item"><div class="evidence-top"><b>${esc(item.name)}</b><strong>${won(item.price)}</strong></div><small>최근 7일 요약 · ${esc(item.unit)} · ${esc(source === "실시간 API" ? "백엔드 조회값" : "시연용 2년 시계열")}</small><small>${esc(trendText(item))} · ${esc(normalText(item))}</small></div>`).join("");
}

async function ask(question) {
  const cleaned = String(question || "").trim();
  if (!cleaned) return;
  $("#chatInput").value = cleaned;
  $("#sendBtn").disabled = true;
  $("#sendBtn").textContent = "찾는 중…";
  markTrace(0);
  const liveTimer = setTimeout(() => markTrace(1), 180);
  const result = (await tryLiveAgent(cleaned)) || localAgent(cleaned);
  clearTimeout(liveTimer);
  markTrace(2);
  renderEvidence(result.items, result.source);
  memories.push({ question: cleaned, answer: result.text, source: result.source || "로컬 근거 검색", time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) });
  memories = memories.slice(-12);
  writeJson(STORAGE.memory, memories);
  renderMessages();
  markTrace(3);
  updateMetrics();
  $("#sendBtn").disabled = false;
  $("#sendBtn").innerHTML = "물어보기 <span>↗</span>";
}

$("#chatForm").addEventListener("submit", (event) => { event.preventDefault(); ask($("#chatInput").value); });
$$('[data-ask]').forEach((button) => button.addEventListener("click", () => ask(button.dataset.ask)));

function setServerStatus() {
  const base = String(window.APP_CONFIG?.API_BASE_URL || "");
  if (base && !/localhost|127\.0\.0\.1/.test(base)) {
    fetch(`${base.replace(/\/$/, "")}/health`).then((res) => { if (!res.ok) throw new Error("offline"); $("#serverState").textContent = "실시간 API 연결"; $(".app-status").classList.add("live"); }).catch(() => { $("#serverState").textContent = "로컬 체험 모드"; });
  }
}

function populateManualItems() { $("#manualItem").innerHTML = catalog.map((item) => `<option value="${item.id}">${esc(item.display)} · ${won(item.price)}</option>`).join(""); }
function switchMarket(mode) { activeMarket = mode; $$("[data-market]").forEach((button) => { const selected = button.dataset.market === mode; button.classList.toggle("selected", selected); button.setAttribute("aria-selected", String(selected)); }); ["photo", "barcode", "manual"].forEach((key) => $("#market" + key[0].toUpperCase() + key.slice(1)).classList.toggle("hidden", key !== mode)); }
$$('[data-market]').forEach((button) => button.addEventListener("click", () => switchMarket(button.dataset.market)));

function guessPhotoCandidates(fileName) {
  const keyword = String(fileName).toLowerCase();
  const hit = catalog.find((item) => keyword.includes(item.name.replaceAll(" ", "").toLowerCase()) || keyword.includes(item.id));
  if (hit) return [hit, ...catalog.filter((item) => item.category === hit.category && item.id !== hit.id).slice(0, 2)];
  return [itemById("cabbage"), itemById("pork"), itemById("mackerel")];
}

$("#photoInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const img = $("#photoPreview");
  img.src = URL.createObjectURL(file); img.hidden = false;
  photoSelection = guessPhotoCandidates(file.name)[0];
  const candidates = guessPhotoCandidates(file.name);
  $("#photoGuess").innerHTML = `<span>사진에서 확인할 후보를 골라주세요.</span><div class="candidates">${candidates.map((item, index) => `<button type="button" class="candidate ${index === 0 ? "selected" : ""}" data-candidate="${item.id}">${index + 1}. ${esc(item.name)} · ${won(item.price)}</button>`).join("")}</div><small class="hint">후보를 선택한 뒤에만 장바구니에 담깁니다.</small>`;
  $$("[data-candidate]").forEach((button) => button.addEventListener("click", () => { $$("[data-candidate]").forEach((candidate) => candidate.classList.remove("selected")); button.classList.add("selected"); photoSelection = itemById(button.dataset.candidate); }));
});

function photoSlug(value) {
  return String(value || "재료").toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "ingredient";
}

function mapVisionCandidate(candidate) {
  const name = String(candidate.name || "").trim();
  const compact = name.replace(/\s+/g, "");
  const known = catalog.find((item) => {
    const knownName = item.name.replace(/\s+/g, "");
    return compact.includes(knownName) || knownName.includes(compact);
  });
  if (known) return { ...known, confidence: Number(candidate.confidence || 0), visionNotes: candidate.notes || "" };
  const id = "vision-" + photoSlug(name);
  const existing = itemById(id);
  if (existing) return { ...existing, confidence: Number(candidate.confidence || 0), visionNotes: candidate.notes || "" };
  const item = { id, name, display: name + " " + (candidate.unit || "개"), price: 0, category: candidate.category || "기타", unit: candidate.unit || "개", change: 0, normal: 0, verdict: "가격 직접 입력", season: "확인 필요", confidence: Number(candidate.confidence || 0), visionNotes: candidate.notes || "" };
  catalog.push(item);
  return item;
}

function renderPhotoCandidates(candidates, source) {
  photoCandidates = (candidates || []).map(mapVisionCandidate).filter(Boolean);
  photoSelection = photoCandidates[0] || null;
  $("#photoControls").hidden = !photoSelection;
  $("#photoPrice").value = photoSelection && photoSelection.price ? String(photoSelection.price) : "";
  if (!photoCandidates.length) {
    $("#photoGuess").innerHTML = "<span>" + esc(source || "AI 사진 분석") + " 결과가 없습니다. 밝은 곳에서 식재료 한 품목씩 다시 찍어 주세요.</span>";
    return;
  }
  $("#photoGuess").innerHTML = "<span>" + esc(source || "AI 사진 분석") + " 후보입니다. 가장 가까운 품목을 선택해 주세요.</span><div class=\"candidates\">" + photoCandidates.map((item, index) => "<button type=\"button\" class=\"candidate " + (index === 0 ? "selected" : "") + "\" data-candidate=\"" + esc(item.id) + "\">" + (index + 1) + ". " + esc(item.name) + " · " + Math.round((item.confidence || 0) * 100) + "%</button>").join("") + "</div><small class=\"hint\">사진 인식은 참고용입니다. 후보와 가격을 확인한 뒤 장바구니에 담습니다.</small>";
  $$("[data-candidate]").forEach((button) => button.addEventListener("click", () => {
    $$("[data-candidate]").forEach((candidateButton) => candidateButton.classList.remove("selected"));
    button.classList.add("selected");
    photoSelection = photoCandidates.find((item) => item.id === button.dataset.candidate) || null;
    $("#photoPrice").value = photoSelection && photoSelection.price ? String(photoSelection.price) : "";
  }));
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressPhoto(file) {
  const dataUrl = await fileAsDataUrl(file);
  const image = new Image();
  image.src = dataUrl;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function tryLivePhoto(dataUrl, filename) {
  const base = String(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  if (!base) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(base + "/api/recognize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_data: dataUrl, filename }), signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.candidates) ? data : null;
  } catch { return null; } finally { clearTimeout(timeout); }
}

async function analyzePhoto(file) {
  lastPhotoFile = file;
  $("#photoGuess").innerHTML = "<span>AI가 사진 속 식재료를 찾는 중입니다…</span>";
  $("#photoControls").hidden = true;
  try {
    const dataUrl = await compressPhoto(file);
    const result = await tryLivePhoto(dataUrl, file.name);
    if (result) {
      renderPhotoCandidates(result.candidates, result.message || "AI 사진 분석");
      return;
    }
    renderPhotoCandidates(guessPhotoCandidates(file.name).map((item) => ({ name: item.name, category: item.category, confidence: 0.25, unit: item.unit })), "서버에 연결되지 않아 임시");
  } catch {
    renderPhotoCandidates([], "사진 처리");
  }
}

$("#photoInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await analyzePhoto(file);
});
$("#photoAnalyze").addEventListener("click", () => { if (lastPhotoFile) analyzePhoto(lastPhotoFile); });

$("#barcodeInput").addEventListener("input", (event) => {
  const item = itemById(barcodeMap[event.target.value]);
  $("#barcodeResult").textContent = item ? `상품 후보: ${item.display} · ${won(item.price)} · ${item.category}` : "등록된 샘플이 아니면 직접 입력 방식으로 이어갈 수 있습니다.";
});
$("#scanBtn").addEventListener("click", () => { $("#barcodeResult").textContent = "카메라 인식 훅을 확인했습니다. 실기기에서는 권한을 허용한 뒤 바코드를 비춰주세요. 지금은 숫자를 직접 입력해도 됩니다."; });

function addToCart(item, price, source) {
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) { existing.qty += 1; existing.price = price || existing.price; existing.source = source; }
  else cart.push({ id: item.id, name: item.name, display: item.display, price: Number(price) || item.price, qty: 1, source, category: item.category });
  persist();
}

$("#addMarketBtn").addEventListener("click", () => {
  let item; let price; let source;
  if (activeMarket === "photo") { item = photoSelection; price = Number($("#photoPrice").value || item?.price || 0); source = "AI 사진 후보·사용자 확인"; }
  if (activeMarket === "barcode") { item = itemById(barcodeMap[$("#barcodeInput").value]); price = item?.price; source = "바코드 샘플"; }
  if (activeMarket === "manual") { item = itemById($("#manualItem").value); price = Number($("#manualPrice").value); source = "직접 입력"; }
  if (!item) { $("#marketMessage").textContent = "먼저 재료 후보를 선택하거나 바코드를 확인해 주세요."; return; }
  if (!price) { $("#marketMessage").textContent = "가격을 입력한 뒤 다시 확인해 주세요."; return; }
  addToCart(item, price, source);
  const receipt = Number($("#receiptTotal").value || 0);
  if (receipt) { receiptTotal = receipt; localStorage.setItem(STORAGE.receipt, String(receipt)); }
  $("#marketMessage").textContent = `${item.display}을(를) 장바구니에 담았습니다.`;
  go("cart");
});

function renderRecommendations() {
  const mood = $("#mood").value;
  const people = Number($("#people").value) || 2;
  const time = $("#time").value;
  const ranked = [...dishCatalog].sort((a, b) => (a.mood === mood ? -1 : 0) - (b.mood === mood ? -1 : 0));
  $("#recommendResult").innerHTML = ranked.slice(0, 3).map((dish, index) => {
    const items = dish.ingredients.map(itemById); const estimate = items.reduce((sum, item) => sum + item.price, 0) * people;
    return `<article class="recommend"><span class="rank">${index + 1}순위 · ${dish.mood === mood ? "조건 일치" : "가격·시간 균형"}</span><h3>${esc(dish.title)}</h3><p>${items.map((item) => esc(item.name)).join(" · ")}</p><small>${esc(dish.note)} · ${people}인 약 ${won(estimate)}</small><button type="button" class="secondary add-dish" data-dish="${dish.title}">재료 담기</button></article>`;
  }).join("");
  $$(".add-dish").forEach((button) => button.addEventListener("click", () => { const dish = dishCatalog.find((entry) => entry.title === button.dataset.dish); dish.ingredients.map(itemById).forEach((item) => addToCart(item, item.price, "밥상추천")); go("cart"); }));
}
$("#recommendBtn").addEventListener("click", renderRecommendations);

function renderCart() {
  const box = $("#cartItems");
  box.innerHTML = cart.length ? cart.map((item) => `<div class="cart-row card"><div><b>${esc(item.display || item.name)}</b><small>${won(item.price)} · ${esc(item.source || "직접 입력")} · ${esc(item.category || "재료")}</small></div><div class="quantity"><button type="button" data-minus="${item.id}" aria-label="수량 줄이기">−</button><b>${item.qty}</b><button type="button" data-plus="${item.id}" aria-label="수량 늘리기">＋</button></div></div>`).join("") : `<div class="card empty-inline">아직 담긴 재료가 없습니다. 시장 담기나 밥상 추천에서 재료를 넣어보세요.</div>`;
  $$("[data-minus]").forEach((button) => button.addEventListener("click", () => { const item = cart.find((entry) => entry.id === button.dataset.minus); if (item) item.qty -= 1; cart = cart.filter((entry) => entry.qty > 0); persist(); }));
  $$("[data-plus]").forEach((button) => button.addEventListener("click", () => { const item = cart.find((entry) => entry.id === button.dataset.plus); if (item) item.qty += 1; persist(); }));
  $("#cartTotal").textContent = won(totalCart());
  $("#receiptSaved").hidden = !receiptTotal;
  if (receiptTotal) $("#receiptSaved").textContent = `영수증 합계 ${won(receiptTotal)}를 이 기기에 기록했습니다. 사진 파일은 저장하지 않았습니다.`;
}

async function copyText(value, successTarget) { try { await navigator.clipboard.writeText(value); } catch { const area = document.createElement("textarea"); area.value = value; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); } if (successTarget) successTarget.textContent = "장보기 목록을 클립보드에 복사했습니다."; }
$("#exportCart").addEventListener("click", () => copyText(cart.map((item) => `${item.display || item.name} × ${item.qty}`).join("\n") || "장바구니가 비어 있습니다.", $("#receiptSaved")));

function renderInstructor() { const people = Number($("#classPeople").value) || 1; $("#perPerson").textContent = won(Math.ceil(totalCart() / people)); }
$("#classPeople").addEventListener("input", renderInstructor);
$("#copyClass").addEventListener("click", () => { const people = Number($("#classPeople").value) || 1; const list = [`[요리교실 준비표] ${people}명`, ...cart.map((item) => `- ${item.display || item.name} × ${item.qty}`), `- 1인 예상 비용: ${won(Math.ceil(totalCart() / people))}`].join("\n"); copyText(list, $("#classMessage")); renderInstructor(); });

$("#clearMemoryBtn").addEventListener("click", () => { memories = []; localStorage.removeItem(STORAGE.memory); $("#evidenceStatus").textContent = "대기 중"; $("#evidenceList").innerHTML = `<div class="empty-inline">기억을 지웠습니다. 새 질문을 보내면 다시 기록됩니다.</div>`; renderMessages(); updateMetrics(); });

populateManualItems(); renderMessages(); renderCart(); renderInstructor(); updateMetrics(); setServerStatus();
