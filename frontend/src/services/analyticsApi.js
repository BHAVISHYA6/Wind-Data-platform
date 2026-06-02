import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 12000,
});

const normalizeSummaryPayload = (payload) => ({
  totalRecords: payload.totalRecords ?? payload.totalWindDataRecords ?? 0,
  totalErrorLogs: payload.totalErrorLogs ?? payload.totalErrorLogRecords ?? 0,
  avgHumidity: payload.avgHumidity ?? payload.averageHumidity ?? null,
  avgTemperature: payload.avgTemperature ?? payload.averageTemperature ?? null,
});

export const fetchSummaryAnalytics = async () => {
  const response = await apiClient.get('/api/analytics/summary');
  const payload = response.data?.data ?? response.data ?? {};
  return normalizeSummaryPayload(payload);
};
