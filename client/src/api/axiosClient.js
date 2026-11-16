import axios from 'axios'
import jwt_decode from 'jwt-decode'
// const BASE_URL = "http://localhost:5000/api/v1/"
import { toast } from 'react-toastify';

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

const jwtAxios = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})


axiosClient.interceptors.request.use(async (config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    const date = new Date()
    const decodedToken = jwt_decode(accessToken)
    if (decodedToken.exp < date.getTime() / 1000) {
      try {
        const res = await jwtAxios.post(`auth/refresh-token/`);
        const newAccessToken = res.data.token
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken)
          config.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        
      } catch (error) {
        if ([401, 403].includes(error.response?.status)) {
          localStorage.removeItem('accessToken')
        }
      }
    } else {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});


axiosClient.interceptors.response.use(
  (res) => res.data, 
  (error) => {
    if (!error.config?.skipErrorToast) {
      toast.error(error.response?.data?.message || error.message, { autoClose: 2000 })
    }
    return Promise.reject(error)
})

export default axiosClient
