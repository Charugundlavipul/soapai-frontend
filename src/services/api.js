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
export const postBehaviour = body => api.post('/behaviours', body);
export const deleteBehaviour = id => api.delete(`/behaviours/${id}`);

// Non Gpt
export const getClients   = ()           => api.get('/clients');
export const postClient   = body         => api.post('/clients', body);


export default api;
