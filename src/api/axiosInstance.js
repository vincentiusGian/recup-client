import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: 'https://recup-backend-production.up.railway.app',
});

export default axiosInstance;
