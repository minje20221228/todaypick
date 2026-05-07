const adminState = {
  user: null,
  users: [],
  reports: []
};

const adminEl = {
  themeToggle: document.querySelector("#themeToggle"),
  summaryGrid: document.querySelector("#summaryGrid"),
  usersArea: document.querySelector("#usersArea"),
  reportsArea: document.querySelector("#reportsArea"),
  adminAccountForm: document.querySelector("#adminAccountForm"),
  adminEmail: document.querySelector("#adminEmail"),
  adminCurrentPassword: document.querySelector("#adminCurrentPassword"),
  adminNewPassword: document.querySelector("#adminNewPassword"),
  adminAccountMessage: document.querySelector("#adminAccountMessage")
};

function applyAdminTheme() {
  const theme = localStorage.getItem("todayPickTheme") || "light";
  document.body.classList.toggle("dark", theme === "dark");
  adminEl.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleAdminTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("todayPickTheme", isDark ? "dark" : "light");
  adminEl.themeToggle.textContent = isDark ? "☀️" : "🌙";
}

function card(title, value) {
  const item = document.createElement("div");
  item.className = "summaryCard";
  const small = document.createElement("small");
  small.textContent = title;
  const strong = document.createElement("strong");
  strong.textContent = value;
  item.append(small, strong);
  return item;
}

async function loadSummary() {
  const result = await api.adminSummary();
  const s = result.summary;
  adminEl.summaryGrid.replaceChildren(
    card("회원", s.users),
    card("차단 회원", s.blockedUsers),
    card("추천글", s.posts),
    card("리뷰", s.reviews),
    card("검토 대기 신고", s.pendingReports)
  );
}

async function loadUsers() {
  const result = await api.adminUsers();
  adminState.users = result.users;
  renderUsers();
}

function renderUsers() {
  if (!adminState.users.length) {
    adminEl.usersArea.textContent = "사용자가 없습니다.";
    return;
  }

  adminEl.usersArea.replaceChildren(...adminState.users.map((user) => {
    const row = document.createElement("article");
    row.className = "adminRow";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${user.nickname || user.name} · @${user.username} · ${user.email}`;
    const meta = document.createElement("small");
    meta.textContent = `${user.role} · ${user.isBlocked ? "차단됨" : "정상"}`;
    info.append(title, meta);

    const btn = document.createElement("button");
    btn.className = user.isBlocked ? "ghostBtn" : "dangerBtn";
    btn.type = "button";
    btn.textContent = user.isBlocked ? "차단 해제" : "차단";
    btn.disabled = user.role === "admin";
    btn.addEventListener("click", async () => {
      await api.adminBlockUser(user.id, !user.isBlocked);
      await loadUsers();
      await loadSummary();
    });

    row.append(info, btn);
    return row;
  }));
}

async function loadReports() {
  const result = await api.adminReports();
  adminState.reports = result.reports;
  renderReports();
}

function renderReports() {
  if (!adminState.reports.length) {
    adminEl.reportsArea.textContent = "신고 내역이 없습니다.";
    return;
  }

  adminEl.reportsArea.replaceChildren(...adminState.reports.map((report) => {
    const row = document.createElement("article");
    row.className = "adminRow reportRow";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${report.reason} · ${report.placeName}`;
    const meta = document.createElement("small");
    meta.textContent = `상태: ${report.status} · 신고자: ${report.reporterName} · 작성자: ${report.authorName}`;
    const details = document.createElement("p");
    details.textContent = report.details || report.postTitle;
    info.append(title, meta, details);

    const actions = document.createElement("div");
    actions.className = "postButtons";

    ["reviewed", "dismissed", "pending"].forEach((status) => {
      const btn = document.createElement("button");
      btn.className = status === "dismissed" ? "dangerBtn" : "ghostBtn smallBtn";
      btn.type = "button";
      btn.textContent = status;
      btn.addEventListener("click", async () => {
        await api.adminReportStatus(report.id, status);
        await loadReports();
        await loadSummary();
      });
      actions.append(btn);
    });

    row.append(info, actions);
    return row;
  }));
}

async function handleAdminAccount(event) {
  event.preventDefault();
  adminEl.adminAccountMessage.textContent = "";
  try {
    const result = await api.adminUpdateAccount({
      email: adminEl.adminEmail.value.trim(),
      currentPassword: adminEl.adminCurrentPassword.value,
      newPassword: adminEl.adminNewPassword.value
    });
    adminState.user = result.user;
    adminEl.adminAccountMessage.style.color = "var(--success)";
    adminEl.adminAccountMessage.textContent = "관리자 계정이 변경되었습니다.";
    adminEl.adminCurrentPassword.value = "";
    adminEl.adminNewPassword.value = "";
  } catch (error) {
    adminEl.adminAccountMessage.style.color = "var(--danger)";
    adminEl.adminAccountMessage.textContent = error.message;
  }
}

async function initAdmin() {
  applyAdminTheme();
  adminEl.themeToggle.addEventListener("click", toggleAdminTheme);
  adminEl.adminAccountForm.addEventListener("submit", handleAdminAccount);

  try {
    await api.init();
    const me = await api.me();
    if (!me.user || me.user.role !== "admin") {
      alert("관리자 로그인이 필요합니다.");
      location.href = "./index.html";
      return;
    }

    adminState.user = me.user;
    adminEl.adminEmail.value = me.user.email;

    await loadSummary();
    await loadReports();
    await loadUsers();
  } catch (error) {
    alert(error.message);
    location.href = "./index.html";
  }
}

initAdmin();
