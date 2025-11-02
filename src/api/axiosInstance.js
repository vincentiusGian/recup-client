import axios from 'axios'

const url = process.env.REACT_APP_API_URL

const axiosInstance = axios.create({
    baseURL: url,
});

export default axiosInstance;
