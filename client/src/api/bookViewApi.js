import axiosClient from "./axiosClient";

const CONSENT_KEY = "bookViewConsent";
const ANONYMOUS_ID_KEY = "bookViewAnonymousId";

const getAnonymousId = () => {
  try {
    let id = window.sessionStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      if (!window.crypto?.randomUUID) return null;
      id = window.crypto.randomUUID();
      window.sessionStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

const hasAccessToken = () => {
  try {
    return Boolean(localStorage.getItem("accessToken"));
  } catch {
    return false;
  }
};

const bookViewApi = {
  hasConsent: () => {
    try {
      return window.sessionStorage.getItem(CONSENT_KEY) === "accepted";
    } catch {
      return false;
    }
  },
  getConsentChoice: () => {
    try {
      return window.sessionStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  },
  hasAuthenticatedSession: hasAccessToken,
  setConsent: (accepted) => {
    try {
      window.sessionStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "declined");
    } catch {
      // If the browser cannot retain consent for the session, do not track anonymously.
    }
  },
  record: (bookId, anonymousConsent = false) => {
    const payload = { bookId };
    if (!hasAccessToken()) {
      if (!anonymousConsent) return Promise.resolve(null);
      const anonymousId = getAnonymousId();
      if (!anonymousId) return Promise.resolve(null);
      payload.anonymousId = anonymousId;
      payload.consent = true;
    }
    return axiosClient.post("book-views/", payload, { skipErrorToast: true });
  },
  getMine: (limit = 20) => axiosClient.get("book-views/", { params: { limit } }),
  deleteMine: () => axiosClient.delete("book-views/"),
  deleteAnonymous: () => {
    let anonymousId;
    try { anonymousId = window.sessionStorage.getItem(ANONYMOUS_ID_KEY); } catch { return Promise.resolve(null); }
    if (!anonymousId) return Promise.resolve(null);
    return axiosClient.delete("book-views/anonymous", {
      data: { anonymousId },
      skipErrorToast: true,
    }).then((result) => {
      try { window.sessionStorage.removeItem(ANONYMOUS_ID_KEY); } catch {}
      return result;
    });
  },
};

export default bookViewApi;
