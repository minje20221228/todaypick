const api = {
  csrfToken: "",
  async init() { await this.refreshCsrf(); },
  async refreshCsrf() {
    const data = await this.request("/api/csrf");
    this.csrfToken = data.csrfToken;
  },
  async request(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    let response;
    try {
      response = await fetch(url, { credentials: "same-origin", ...options, headers });
    } catch (error) {
      if (location.protocol === "file:") {
        throw new Error("API 서버에 연결할 수 없습니다. 파일을 직접 열지 말고 https://todaypick.com 또는 로컬 npm start 주소로 접속해주세요.");
      }
      throw new Error("API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
    }
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.message || "요청 처리 중 오류가 발생했습니다.");
    return data;
  },
  me() { return this.request("/api/auth/me"); },  checkDuplicate(type, value) {
    return this.request(`/api/auth/check-duplicate?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`);
  },

  sendEmailCode(email) {
    return this.request("/api/auth/send-email-code", {
      method: "POST",
      headers: { "x-csrf-token": this.csrfToken },
      body: JSON.stringify({ email })
    });
  },
  async signup(payload) {
    const result = await this.request("/api/auth/signup", {
      method: "POST", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload)
    });
    await this.refreshCsrf();
    return result;
  },
  async login(payload) {
    const result = await this.request("/api/auth/login", {
      method: "POST", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload)
    });
    await this.refreshCsrf();
    return result;
  },
  async logout() {
    const result = await this.request("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": this.csrfToken } });
    await this.refreshCsrf();
    return result;
  },
  getPosts() { return this.request("/api/posts"); },
  createPost(payload) { return this.request("/api/posts", { method: "POST", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload) }); },
  deletePost(id) { return this.request(`/api/posts/${id}`, { method: "DELETE", headers: { "x-csrf-token": this.csrfToken } }); },
  reportPost(id, payload) { return this.request(`/api/posts/${id}/reports`, { method: "POST", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload) }); },
  getReviewSummary() { return this.request("/api/reviews/summary"); },
  getReviews(placeId) { return this.request(`/api/places/${placeId}/reviews`); },
  saveReview(placeId, payload) { return this.request(`/api/places/${placeId}/reviews`, { method: "POST", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload) }); },
  adminSummary() { return this.request("/api/admin/summary"); },
  adminUsers() { return this.request("/api/admin/users"); },
  adminReports() { return this.request("/api/admin/reports"); },
  adminSecurityEvents() { return this.request("/api/admin/security-events"); },
  adminBlockUser(id, blocked) { return this.request(`/api/admin/users/${id}/block`, { method: "PATCH", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify({ blocked }) }); },
  adminReportStatus(id, status) { return this.request(`/api/admin/reports/${id}/status`, { method: "PATCH", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify({ status }) }); },
  adminUpdateAccount(payload) { return this.request("/api/admin/account", { method: "PATCH", headers: { "x-csrf-token": this.csrfToken }, body: JSON.stringify(payload) }); }
};
