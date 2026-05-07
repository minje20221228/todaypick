const state = {
  user: null,
  mode: "all",
  favorites: JSON.parse(localStorage.getItem("todayPickFavorites") || "[]"),
  posts: [],
  reviewSummary: {},
  selectedRegion: localStorage.getItem("todayPickSelectedRegion") || "all",
  aiIds: null,
  authMode: "login",
  activeReviewPlaceId: null,
  activeReportPostId: null,
  quizStep: 0,
  quizAnswers: {
    companion: "",
    mood: "",
    budget: ""
  }
};

const QUIZ_STEPS = [
  {
    key: "companion",
    title: "누구랑 가나요?",
    options: [
      { label: "혼자", value: "혼자", emoji: "🌿" },
      { label: "친구", value: "친구", emoji: "🎉" },
      { label: "데이트", value: "데이트", emoji: "💜" },
      { label: "가족", value: "가족", emoji: "🏡" }
    ]
  },
  {
    key: "mood",
    title: "어떤 분위기가 좋아요?",
    options: [
      { label: "힐링", value: "힐링", emoji: "🌱" },
      { label: "감성", value: "감성", emoji: "✨" },
      { label: "트렌디", value: "트렌디", emoji: "🔥" },
      { label: "문화생활", value: "문화생활", emoji: "🎨" }
    ]
  },
  {
    key: "budget",
    title: "예산은 어느 정도인가요?",
    options: [
      { label: "1만원 이하", value: "1만원 이하", emoji: "💚" },
      { label: "1~3만원", value: "1~3만원", emoji: "💙" },
      { label: "3만원 이상", value: "3만원 이상", emoji: "💎" },
      { label: "상관없음", value: "all", emoji: "🙆" }
    ]
  }
];

const el = {
  body: document.body,
  listPage: document.querySelector("#listPage"),
  detailPage: document.querySelector("#detailPage"),
  communityPage: document.querySelector("#communityPage"),
  cardsArea: document.querySelector("#cardsArea"),
  emptyState: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  sectionTitle: document.querySelector("#sectionTitle"),
  searchInput: document.querySelector("#searchInput"),
  regionFilter: document.querySelector("#regionFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  companionFilter: document.querySelector("#companionFilter"),
  budgetFilter: document.querySelector("#budgetFilter"),
  moodFilter: document.querySelector("#moodFilter"),
  indoorFilter: document.querySelector("#indoorFilter"),
  resetBtn: document.querySelector("#resetBtn"),
  themeToggle: document.querySelector("#themeToggle"),
  goHomeBtn: document.querySelector("#goHomeBtn"),
  showFavoritesBtn: document.querySelector("#showFavoritesBtn"),
  showCommunityBtn: document.querySelector("#showCommunityBtn"),
  adminLink: document.querySelector("#adminLink"),
  loginOpenBtn: document.querySelector("#loginOpenBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  toggleFiltersBtn: document.querySelector("#toggleFiltersBtn"),
  searchPanel: document.querySelector("#searchPanel"),
  regionFirstPanel: document.querySelector("#regionFirstPanel"),
  regionButtons: document.querySelector("#regionButtons"),
  allRegionBtn: document.querySelector("#allRegionBtn"),
  aiQuizPanel: document.querySelector("#aiQuizPanel"),
  aiStepText: document.querySelector("#aiStepText"),
  aiQuestionTitle: document.querySelector("#aiQuestionTitle"),
  aiOptions: document.querySelector("#aiOptions"),
  aiRestartBtn: document.querySelector("#aiRestartBtn"),
  selectedRegionText: document.querySelector("#selectedRegionText"),
  aiResultPanel: document.querySelector("#aiResultPanel"),
  aiTitle: document.querySelector("#aiTitle"),
  aiReason: document.querySelector("#aiReason"),
  clearAiBtn: document.querySelector("#clearAiBtn"),

  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authMessage: document.querySelector("#authMessage"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  authSwitchBtn: document.querySelector("#authSwitchBtn"),
  authCloseBtn: document.querySelector("#authCloseBtn"),
  usernameInput: document.querySelector("#usernameInput"),
  emailLabel: document.querySelector("#emailLabel"),
  emailInput: document.querySelector("#emailInput"),
  emailCodeLabel: document.querySelector("#emailCodeLabel"),
  emailCodeInput: document.querySelector("#emailCodeInput"),
  sendEmailCodeBtn: document.querySelector("#sendEmailCodeBtn"),
  nicknameLabel: document.querySelector("#nicknameLabel"),
  nicknameInput: document.querySelector("#nicknameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  authCheckList: document.querySelector("#authCheckList"),

  postModal: document.querySelector("#postModal"),
  postForm: document.querySelector("#postForm"),
  postCloseBtn: document.querySelector("#postCloseBtn"),
  postMessage: document.querySelector("#postMessage"),
  postRegion: document.querySelector("#postRegion"),
  postCategory: document.querySelector("#postCategory"),
  postPlaceName: document.querySelector("#postPlaceName"),
  postTitle: document.querySelector("#postTitle"),
  postContent: document.querySelector("#postContent"),
  postRating: document.querySelector("#postRating"),
  writePostBtn: document.querySelector("#writePostBtn"),
  communityNotice: document.querySelector("#communityNotice"),
  postList: document.querySelector("#postList"),

  reviewModal: document.querySelector("#reviewModal"),
  reviewForm: document.querySelector("#reviewForm"),
  reviewCloseBtn: document.querySelector("#reviewCloseBtn"),
  reviewTitle: document.querySelector("#reviewTitle"),
  reviewList: document.querySelector("#reviewList"),
  reviewRating: document.querySelector("#reviewRating"),
  reviewContent: document.querySelector("#reviewContent"),
  reviewMessage: document.querySelector("#reviewMessage"),

  reportModal: document.querySelector("#reportModal"),
  reportForm: document.querySelector("#reportForm"),
  reportCloseBtn: document.querySelector("#reportCloseBtn"),
  reportReason: document.querySelector("#reportReason"),
  reportDetails: document.querySelector("#reportDetails"),
  reportMessage: document.querySelector("#reportMessage")
};

function option(value, label = value) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function fillSelect(select, firstLabel, values) {
  select.replaceChildren(option("all", firstLabel), ...values.map((value) => option(value)));
}

function fillPlainSelect(select, values) {
  select.replaceChildren(...values.map((value) => option(value)));
}

function initSelects() {
  fillSelect(el.regionFilter, "전체 지역", REGIONS);
  fillSelect(el.categoryFilter, "전체 카테고리", CATEGORIES);
  fillSelect(el.companionFilter, "동행 전체", FILTERS.companion);
  fillSelect(el.budgetFilter, "예산 전체", FILTERS.budget);
  fillSelect(el.moodFilter, "분위기 전체", FILTERS.mood);
  fillSelect(el.indoorFilter, "실내/야외 전체", FILTERS.indoor);

  fillPlainSelect(el.postRegion, REGIONS);
  fillPlainSelect(el.postCategory, CATEGORIES);

  el.regionFilter.value = state.selectedRegion;
}

function renderRegionButtons() {
  const buttons = REGIONS.map((region) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `regionBtn ${state.selectedRegion === region ? "active" : ""}`;
    btn.textContent = region.replace("특별자치도", "").replace("특별자치시", "").replace("광역시", "").replace("특별시", "");
    btn.addEventListener("click", () => selectRegion(region));
    return btn;
  });

  el.regionButtons.replaceChildren(...buttons);
  el.allRegionBtn.classList.toggle("active", state.selectedRegion === "all");
  updateSelectedRegionText();
}

function selectRegion(region) {
  state.selectedRegion = region;
  localStorage.setItem("todayPickSelectedRegion", region);
  el.regionFilter.value = region;
  state.aiIds = null;
  el.aiResultPanel.classList.add("hidden");
  renderRegionButtons();
  renderCards();
  resetQuiz();
  el.aiQuizPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateSelectedRegionText() {
  const label = state.selectedRegion === "all" ? "전국" : state.selectedRegion;
  el.selectedRegionText.textContent = `선택 지역: ${label}`;
}

function resetQuiz() {
  state.quizStep = 0;
  state.quizAnswers = { companion: "", mood: "", budget: "" };
  renderQuizStep();
}

function renderQuizStep() {
  const step = QUIZ_STEPS[state.quizStep];
  el.aiStepText.textContent = `AI 질문 ${state.quizStep + 1}/3`;
  el.aiQuestionTitle.textContent = step.title;

  const buttons = step.options.map((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quizOptionBtn";
    btn.innerHTML = `<span>${item.emoji}</span><strong>${item.label}</strong>`;
    btn.addEventListener("click", () => answerQuiz(step.key, item.value));
    return btn;
  });

  el.aiOptions.replaceChildren(...buttons);
  updateSelectedRegionText();
}

function answerQuiz(key, value) {
  state.quizAnswers[key] = value;

  if (state.quizStep < QUIZ_STEPS.length - 1) {
    state.quizStep += 1;
    renderQuizStep();
    return;
  }

  runAiRecommendationByQuiz();
}

function placeScoreForQuiz(place) {
  const hour = new Date().getHours();
  let score = 0;
  const { companion, mood, budget } = state.quizAnswers;

  if (state.selectedRegion !== "all" && place.region === state.selectedRegion) score += 50;
  if (place.companions.includes(companion)) score += 35;
  if (place.mood === mood) score += 30;
  if (budget === "all" || place.budget === budget) score += 25;

  if (hour >= 18 && ["야경", "맛집", "카페"].includes(place.category)) score += 12;
  if (hour < 18 && ["전시", "산책", "자연", "카페"].includes(place.category)) score += 12;

  const summary = state.reviewSummary[place.id];
  if (summary) {
    score += Number(summary.avgRating || 0) * 3;
    score += Math.min(Number(summary.reviewCount || 0), 10);
  }

  return score;
}

function runAiRecommendationByQuiz() {
  const ranked = [...PLACES]
    .filter((place) => state.selectedRegion === "all" || place.region === state.selectedRegion)
    .map((place) => ({ place, score: placeScoreForQuiz(place) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 9);

  state.aiIds = ranked.map((item) => item.place.id);
  state.mode = "all";

  const regionLabel = state.selectedRegion === "all" ? "전국" : state.selectedRegion;
  el.aiTitle.textContent = "AI 3단계 추천 결과";
  el.aiReason.textContent = `${regionLabel} · ${state.quizAnswers.companion} · ${state.quizAnswers.mood} · ${state.quizAnswers.budget === "all" ? "예산 상관없음" : state.quizAnswers.budget} 기준으로 골랐어요.`;
  el.aiResultPanel.classList.remove("hidden");

  renderCards();
  el.cardsArea.scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveFavorites() {
  localStorage.setItem("todayPickFavorites", JSON.stringify(state.favorites));
}

function isFavorite(id) {
  return state.favorites.includes(id);
}

function toggleFavorite(id) {
  if (isFavorite(id)) {
    state.favorites = state.favorites.filter((item) => item !== id);
  } else {
    state.favorites.push(id);
  }
  saveFavorites();
  renderCards();
}

function getFilteredPlaces() {
  const keyword = el.searchInput.value.trim().toLowerCase();
  const region = el.regionFilter.value;
  const category = el.categoryFilter.value;
  const companion = el.companionFilter.value;
  const budget = el.budgetFilter.value;
  const mood = el.moodFilter.value;
  const indoor = el.indoorFilter.value;

  return PLACES.filter((place) => {
    const text = [
      place.name, place.region, place.city, place.category, place.mood, place.shortDesc,
      place.detailDesc, place.crowdLevel, place.bestVisitTime, place.recommendSituation,
      ...place.tags, ...place.companions
    ].join(" ").toLowerCase();

    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesRegion = region === "all" || place.region === region;
    const matchesCategory = category === "all" || place.category === category;
    const matchesCompanion = companion === "all" || place.companions.includes(companion);
    const matchesBudget = budget === "all" || place.budget === budget;
    const matchesMood = mood === "all" || place.mood === mood;
    const matchesIndoor = indoor === "all" || place.indoor === indoor;
    const matchesFavorite = state.mode === "all" || isFavorite(place.id);
    const matchesAi = !state.aiIds || state.aiIds.includes(place.id);

    return matchesKeyword && matchesRegion && matchesCategory && matchesCompanion && matchesBudget && matchesMood && matchesIndoor && matchesFavorite && matchesAi;
  }).sort((a, b) => {
    if (!state.aiIds) return a.id - b.id;
    return state.aiIds.indexOf(a.id) - state.aiIds.indexOf(b.id);
  });
}

function googleImageUrl(place) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.imageQuery || `${place.region} ${place.name}`)}`;
}

function googleMapUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapQuery || `${place.region} ${place.name}`)}`;
}

function googleDirectionsUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.mapQuery || `${place.region} ${place.name}`)}`;
}

function makeChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function ratingText(placeId) {
  const summary = state.reviewSummary[placeId];
  if (!summary || !summary.reviewCount) return "⭐ 리뷰 없음";
  return `⭐ ${summary.avgRating} · 리뷰 ${summary.reviewCount}`;
}

function createButton(text, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

function createPlaceCard(place) {
  const card = document.createElement("article");
  card.className = "placeCard";

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.style.background = place.gradient;

  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = place.emoji;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = place.category;

  thumb.append(emoji, badge);

  const body = document.createElement("div");
  body.className = "cardBody";

  const titleRow = document.createElement("div");
  titleRow.className = "cardTitle";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = place.name;
  const rating = document.createElement("small");
  rating.className = "ratingLine";
  rating.textContent = ratingText(place.id);
  titleWrap.append(title, rating);

  const heart = createButton(isFavorite(place.id) ? "♥" : "♡", `heartBtn ${isFavorite(place.id) ? "active" : ""}`, () => toggleFavorite(place.id));
  titleRow.append(titleWrap, heart);

  const meta = document.createElement("div");
  meta.className = "meta compactMeta";
  [`📍 ${place.region}`, `⏰ ${place.bestVisitTime}`, `👥 ${place.companions.join(", ")}`].forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    meta.append(span);
  });

  const chips = document.createElement("div");
  chips.className = "chips";
  chips.append(...place.tags.slice(0, 3).map(makeChip));

  const actions = document.createElement("div");
  actions.className = "cardActions grid3";
  actions.append(
    createButton("상세", "primaryBtn", () => showDetail(place.id)),
    createButton("리뷰", "ghostBtn", () => openReviewModal(place.id)),
    createButton("사진", "ghostBtn", () => window.open(googleImageUrl(place), "_blank", "noopener,noreferrer")),
    createButton("약도", "ghostBtn", () => window.open(googleMapUrl(place), "_blank", "noopener,noreferrer")),
    createButton("길찾기", "ghostBtn", () => window.open(googleDirectionsUrl(place), "_blank", "noopener,noreferrer")),
    createButton(isFavorite(place.id) ? "찜해제" : "찜", "ghostBtn", () => toggleFavorite(place.id))
  );

  body.append(titleRow, meta, chips, actions);
  card.append(thumb, body);
  return card;
}

function renderCards() {
  const places = getFilteredPlaces();
  el.cardsArea.replaceChildren(...places.map(createPlaceCard));
  el.resultCount.textContent = `${places.length}개`;
  el.emptyState.classList.toggle("hidden", places.length !== 0);
  el.sectionTitle.textContent = state.mode === "favorites" ? "찜한 장소" : "추천 장소";
}

function showList() {
  el.listPage.classList.remove("hidden");
  el.detailPage.classList.add("hidden");
  el.communityPage.classList.add("hidden");
  renderCards();
}

function showDetail(id) {
  const place = PLACES.find((item) => item.id === id);
  if (!place) return;

  const back = createButton("← 돌아가기", "ghostBtn", showList);

  const card = document.createElement("section");
  card.className = "detailCard";

  const banner = document.createElement("div");
  banner.className = "detailBanner";
  banner.style.background = place.gradient;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = place.category;
  const emoji = document.createElement("div");
  emoji.className = "detailEmoji";
  emoji.textContent = place.emoji;
  banner.append(badge, emoji);

  const body = document.createElement("div");
  body.className = "detailBody";

  const h2 = document.createElement("h2");
  h2.textContent = place.name;

  const meta = document.createElement("div");
  meta.className = "detailGrid";
  [
    ["지역", `${place.region} ${place.city}`],
    ["별점", ratingText(place.id)],
    ["추천 방문 시간", place.bestVisitTime],
    ["혼잡도", place.crowdLevel],
    ["추천 상황", place.recommendSituation],
    ["예산", place.price]
  ].forEach(([label, value]) => {
    const box = document.createElement("div");
    box.className = "infoBox";
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    box.append(small, strong);
    meta.append(box);
  });

  const courseTitle = document.createElement("h3");
  courseTitle.textContent = "추천 코스";
  const course = document.createElement("ul");
  course.className = "courseList";
  place.course.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    course.append(li);
  });

  const actions = document.createElement("div");
  actions.className = "detailActions";
  actions.append(
    createButton("사진 보기", "primaryBtn", () => window.open(googleImageUrl(place), "_blank", "noopener,noreferrer")),
    createButton("약도 보기", "ghostBtn", () => window.open(googleMapUrl(place), "_blank", "noopener,noreferrer")),
    createButton("길찾기", "ghostBtn", () => window.open(googleDirectionsUrl(place), "_blank", "noopener,noreferrer")),
    createButton("리뷰 보기", "ghostBtn", () => openReviewModal(place.id))
  );

  body.append(h2, meta, courseTitle, course, actions);
  card.append(banner, body);
  el.detailPage.replaceChildren(back, card);
  el.listPage.classList.add("hidden");
  el.communityPage.classList.add("hidden");
  el.detailPage.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFilters() {
  el.searchInput.value = "";
  [el.regionFilter, el.categoryFilter, el.companionFilter, el.budgetFilter, el.moodFilter, el.indoorFilter].forEach((select) => select.value = "all");
  state.selectedRegion = "all";
  localStorage.setItem("todayPickSelectedRegion", "all");
  state.mode = "all";
  state.aiIds = null;
  el.aiResultPanel.classList.add("hidden");
  renderRegionButtons();
  resetQuiz();
  renderCards();
}

function applyTheme() {
  const theme = localStorage.getItem("todayPickTheme") || "light";
  document.body.classList.toggle("dark", theme === "dark");
  el.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("todayPickTheme", isDark ? "dark" : "light");
  el.themeToggle.textContent = isDark ? "☀️" : "🌙";
}

function updateAuthUi() {
  if (state.user) {
    el.loginOpenBtn.textContent = `${state.user.nickname || state.user.username}님`;
    el.loginOpenBtn.disabled = true;
    el.logoutBtn.classList.remove("hidden");
    el.adminLink.classList.toggle("hidden", state.user.role !== "admin");
  } else {
    el.loginOpenBtn.textContent = "로그인";
    el.loginOpenBtn.disabled = false;
    el.logoutBtn.classList.add("hidden");
    el.adminLink.classList.add("hidden");
  }
}

function openAuthModal(mode = "login") {
  state.authMode = mode;
  el.authForm.reset();
  el.authMessage.textContent = "";
  renderAuthMode();
  el.authModal.showModal();
}

function renderAuthMode() {
  const isSignup = state.authMode === "signup";
  el.authTitle.textContent = isSignup ? "회원가입" : "로그인";
  el.authSubmitBtn.textContent = isSignup ? "회원가입" : "로그인";
  el.authSwitchBtn.textContent = isSignup ? "로그인으로 전환" : "회원가입으로 전환";
  el.emailLabel.classList.toggle("hidden", !isSignup);
  el.emailCodeLabel.classList.toggle("hidden", !isSignup);
  el.nicknameLabel.classList.toggle("hidden", !isSignup);
  el.sendEmailCodeBtn.classList.toggle("hidden", !isSignup);
  el.emailInput.required = isSignup;
  el.emailCodeInput.required = isSignup;
  el.nicknameInput.required = isSignup;
  el.authCheckList.replaceChildren();
  el.passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
}

function setCheckMessage(type, message, ok) {
  const id = `check-${type}`;
  let item = document.querySelector(`#${id}`);

  if (!item) {
    item = document.createElement("p");
    item.id = id;
    item.className = "checkMessage";
    el.authCheckList.append(item);
  }

  item.textContent = message;
  item.classList.toggle("ok", ok);
  item.classList.toggle("bad", !ok);
}

async function checkDuplicate(type, value) {
  if (state.authMode !== "signup" || !value.trim()) return;

  try {
    const result = await api.checkDuplicate(type, value.trim());
    setCheckMessage(type, result.message, !result.exists);
  } catch (error) {
    setCheckMessage(type, error.message, false);
  }
}

async function sendEmailCode() {
  if (state.authMode !== "signup") return;

  try {
    const result = await api.sendEmailCode(el.emailInput.value.trim());
    el.authMessage.style.color = "var(--success)";
    el.authMessage.textContent = `개발용 인증코드: ${result.devCode}`;
  } catch (error) {
    el.authMessage.style.color = "var(--danger)";
    el.authMessage.textContent = error.message;
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  el.authMessage.style.color = "var(--danger)";
  el.authMessage.textContent = "";

  const payload = {
    username: el.usernameInput.value.trim(),
    email: el.emailInput.value.trim(),
    nickname: el.nicknameInput.value.trim(),
    emailCode: el.emailCodeInput.value.trim(),
    password: el.passwordInput.value
  };

  try {
    const result = state.authMode === "signup"
      ? await api.signup(payload)
      : await api.login({ username: payload.username, password: payload.password });

    state.user = result.user;
    updateAuthUi();
    el.authModal.close();
    await loadPosts();
  } catch (error) {
    el.authMessage.textContent = error.message;
  }
}

async function handleLogout() {
  try {
    await api.logout();
    state.user = null;
    updateAuthUi();
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
}

function openPostModal() {
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  if (state.user.isBlocked) {
    alert("차단된 계정은 작성할 수 없습니다.");
    return;
  }
  el.postForm.reset();
  el.postMessage.textContent = "";
  el.postModal.showModal();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  el.postMessage.textContent = "";
  try {
    await api.createPost({
      region: el.postRegion.value,
      category: el.postCategory.value,
      placeName: el.postPlaceName.value.trim(),
      title: el.postTitle.value.trim(),
      content: el.postContent.value.trim(),
      rating: Number(el.postRating.value)
    });
    el.postModal.close();
    await loadPosts();
    showCommunity();
  } catch (error) {
    el.postMessage.textContent = error.message;
  }
}

async function loadPosts() {
  try {
    const result = await api.getPosts();
    state.posts = result.posts;
    renderPosts();
  } catch (error) {
    el.communityNotice.textContent = error.message;
  }
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "postCard";

  const top = document.createElement("div");
  top.className = "postTop";

  const left = document.createElement("div");
  const meta = document.createElement("div");
  meta.className = "postMeta";
  [`📍 ${post.region}`, `🏷️ ${post.category}`, `⭐ ${post.rating}`, `👤 ${post.authorName}`].forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    meta.append(span);
  });

  const title = document.createElement("h3");
  title.textContent = post.title;
  const place = document.createElement("strong");
  place.textContent = post.placeName;

  left.append(meta, title, place);
  top.append(left);

  const right = document.createElement("div");
  right.className = "postButtons";
  if (state.user && (state.user.id === post.userId || state.user.role === "admin")) {
    right.append(createButton("삭제", "dangerBtn", async () => {
      if (!confirm("삭제할까요?")) return;
      await api.deletePost(post.id);
      await loadPosts();
    }));
  }

  if (state.user && state.user.id !== post.userId) {
    right.append(createButton("신고", "ghostBtn smallBtn", () => openReportModal(post.id)));
  }

  top.append(right);

  const content = document.createElement("p");
  content.textContent = post.content;
  const date = document.createElement("small");
  date.className = "dateLine";
  date.textContent = formatDate(post.createdAt);

  card.append(top, content, date);
  return card;
}

function renderPosts() {
  el.communityNotice.textContent = state.user ? `${state.user.nickname || state.user.username}님, 좋은 장소를 추천해보세요.` : "로그인하면 추천글을 작성할 수 있어요.";
  if (!state.posts.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 추천글이 없습니다.";
    el.postList.replaceChildren(empty);
    return;
  }
  el.postList.replaceChildren(...state.posts.map(createPostCard));
}

function showCommunity() {
  el.listPage.classList.add("hidden");
  el.detailPage.classList.add("hidden");
  el.communityPage.classList.remove("hidden");
  renderPosts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadReviewSummary() {
  try {
    const result = await api.getReviewSummary();
    state.reviewSummary = result.summary || {};
  } catch (error) {
    console.error(error);
  }
}

async function openReviewModal(placeId) {
  const place = PLACES.find((item) => item.id === placeId);
  if (!place) return;

  state.activeReviewPlaceId = placeId;
  el.reviewTitle.textContent = `${place.name} 리뷰`;
  el.reviewMessage.textContent = "";
  el.reviewContent.value = "";

  await renderReviewList(placeId);
  el.reviewModal.showModal();
}

async function renderReviewList(placeId) {
  try {
    const result = await api.getReviews(placeId);
    if (!result.reviews.length) {
      const empty = document.createElement("p");
      empty.className = "empty smallEmpty";
      empty.textContent = "아직 리뷰가 없습니다.";
      el.reviewList.replaceChildren(empty);
      return;
    }

    el.reviewList.replaceChildren(...result.reviews.map((review) => {
      const item = document.createElement("div");
      item.className = "reviewItem";
      const top = document.createElement("strong");
      top.textContent = `⭐ ${review.rating} · ${review.authorName}`;
      const text = document.createElement("p");
      text.textContent = review.content;
      item.append(top, text);
      return item;
    }));
  } catch (error) {
    el.reviewList.textContent = error.message;
  }
}

async function handleReviewSubmit(event) {
  event.preventDefault();
  if (!state.user) {
    el.reviewModal.close();
    openAuthModal("login");
    return;
  }
  el.reviewMessage.textContent = "";

  try {
    await api.saveReview(state.activeReviewPlaceId, {
      rating: Number(el.reviewRating.value),
      content: el.reviewContent.value.trim()
    });
    await loadReviewSummary();
    await renderReviewList(state.activeReviewPlaceId);
    el.reviewContent.value = "";
    renderCards();
  } catch (error) {
    el.reviewMessage.textContent = error.message;
  }
}

function openReportModal(postId) {
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  state.activeReportPostId = postId;
  el.reportMessage.textContent = "";
  el.reportDetails.value = "";
  el.reportModal.showModal();
}

async function handleReportSubmit(event) {
  event.preventDefault();
  el.reportMessage.textContent = "";

  try {
    await api.reportPost(state.activeReportPostId, {
      reason: el.reportReason.value,
      details: el.reportDetails.value.trim()
    });
    el.reportModal.close();
    alert("신고가 접수되었습니다.");
  } catch (error) {
    el.reportMessage.textContent = error.message;
  }
}

function bindEvents() {
  [el.searchInput, el.categoryFilter, el.companionFilter, el.budgetFilter, el.moodFilter, el.indoorFilter]
    .forEach((item) => item.addEventListener("input", renderCards));

  el.regionFilter.addEventListener("input", () => {
    state.selectedRegion = el.regionFilter.value;
    localStorage.setItem("todayPickSelectedRegion", state.selectedRegion);
    renderRegionButtons();
    renderCards();
  });

  el.allRegionBtn.addEventListener("click", () => selectRegion("all"));
  el.aiRestartBtn.addEventListener("click", resetQuiz);

  el.clearAiBtn.addEventListener("click", () => {
    state.aiIds = null;
    el.aiResultPanel.classList.add("hidden");
    resetQuiz();
    renderCards();
  });

  el.toggleFiltersBtn.addEventListener("click", () => {
    const hidden = el.searchPanel.classList.toggle("hidden");
    el.toggleFiltersBtn.textContent = hidden ? "상세 필터 열기" : "상세 필터 닫기";
  });

  el.resetBtn.addEventListener("click", resetFilters);
  el.themeToggle.addEventListener("click", toggleTheme);

  el.goHomeBtn.addEventListener("click", () => {
    state.mode = "all";
    showList();
  });

  el.showFavoritesBtn.addEventListener("click", () => {
    state.mode = "favorites";
    state.aiIds = null;
    el.aiResultPanel.classList.add("hidden");
    showList();
  });

  el.showCommunityBtn.addEventListener("click", showCommunity);
  el.loginOpenBtn.addEventListener("click", () => openAuthModal("login"));
  el.logoutBtn.addEventListener("click", handleLogout);

  el.authCloseBtn.addEventListener("click", () => el.authModal.close());
  el.authSwitchBtn.addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "signup" : "login";
    el.authMessage.textContent = "";
    renderAuthMode();
  });
  el.usernameInput.addEventListener("blur", () => checkDuplicate("username", el.usernameInput.value));
  el.nicknameInput.addEventListener("blur", () => checkDuplicate("nickname", el.nicknameInput.value));
  el.sendEmailCodeBtn.addEventListener("click", sendEmailCode);
  el.authForm.addEventListener("submit", handleAuthSubmit);

  el.writePostBtn.addEventListener("click", openPostModal);
  el.postCloseBtn.addEventListener("click", () => el.postModal.close());
  el.postForm.addEventListener("submit", handlePostSubmit);

  el.reviewCloseBtn.addEventListener("click", () => el.reviewModal.close());
  el.reviewForm.addEventListener("submit", handleReviewSubmit);

  el.reportCloseBtn.addEventListener("click", () => el.reportModal.close());
  el.reportForm.addEventListener("submit", handleReportSubmit);
}

async function init() {
  initSelects();
  renderRegionButtons();
  renderQuizStep();
  bindEvents();
  applyTheme();
  renderCards();

  try {
    await api.init();
    const me = await api.me();
    state.user = me.user;
    updateAuthUi();
    await loadReviewSummary();
    await loadPosts();
    renderCards();
  } catch (error) {
    console.error(error);
  }
}

init();
