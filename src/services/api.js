// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',   // change when you deploy
  headers: { 'Content-Type': 'application/json' }
});

/* ───── attach JWT if we have one ───── */
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('jwt');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/* ───── wrapped helpers ───── */
export const getProfile   = ()           => api.get('/profile');
export const patchProfile = data => {
  // auto-set multipart header if FormData
  const cfg = data instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  return api.patch('/profile', data, cfg);
};
export const patchPassword = body        => api.patch('/profile/password', body);
export const logout        = ()          => api.post('/auth/logout');
export const getBehaviours = () => api.get('/behaviours');
export const postBehaviour  = body      =>
  api.post('/behaviours', body, {
    headers:{ 'Content-Type':'application/json' }
  });
export const deleteBehaviour = id => api.delete(`/behaviours/${id}`);

// Non Gpt
export const getClients   = ()           => api.get('/clients');
export const postClient   = body         => api.post('/clients', body);
export const getAppointment = id =>
  api.get(`/appointments/${id}`);

export const uploadVideo = (appointmentId, formData) =>
  api.post(`/appointments/${appointmentId}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const patchVideoGoals = (id, body) =>
  api.patch(`/videos/${id}/goals`, body);

// src/services/api.js
export const chatLLM = body => api.post('/chat', body);
export const getVideo = id => api.get(`/videos/${id}`);
export const getTranscript = id => api.get(`/videos/${id}/transcript`);
export const getPatient = (id) => api.get(`/clients/${id}`);
export const patchPatient = (id, body) => {
  // If you need to upload a new avatar, pass a FormData and set multipart header.
  const cfg = body instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  return api.patch(`/clients/${id}`, body, cfg);
};

export const getGroup = (id) => api.get(`/groups/${id}`);
export const getCategories   = () => api.get("/annual-goals");
export const postCategory    = (body) => api.post("/annual-goals", body);
export const deleteCategory  = (id) => api.delete(`/annual-goals/${id}`);
export const updateCategory = (id, body) => api.patch(`/annual-goals/${id}`, body);
export function deleteGoal(catId, goalId) {
  return api.delete(`/annual-goals/${catId}/goals/${goalId}`);
}




export default api;
