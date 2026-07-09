export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("rf_token");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:session-expired"));
  }
  
  return res;
};

export const onSessionExpired = (callback: () => void): () => void => {
  window.addEventListener("auth:session-expired", callback);
  return () => {
    window.removeEventListener("auth:session-expired", callback);
  };
};
