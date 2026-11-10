import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  timeout: 60000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred during request.";
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

