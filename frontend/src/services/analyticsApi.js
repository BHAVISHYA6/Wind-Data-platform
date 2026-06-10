import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 120000,
});

const normalizeSummaryPayload = (payload) => ({
  datasetId: payload.datasetId ?? null,
  datasetName: payload.datasetName ?? 'No active dataset',
  uploadTimestamp: payload.uploadTimestamp ?? null,
  totalRecords: payload.totalRecords ?? payload.totalWindDataRecords ?? 0,
  totalErrorLogs: payload.totalErrorLogs ?? payload.totalErrorLogRecords ?? 0,
  avgHumidity: payload.avgHumidity ?? payload.averageHumidity ?? null,
  avgTemperature: payload.avgTemperature ?? payload.averageTemperature ?? null,
});

export const fetchSummaryAnalytics = async (datasetId) => {
  const response = await apiClient.get('/api/analytics/summary', { params: { datasetId } });
  const payload = response.data?.data ?? response.data ?? {};
  return normalizeSummaryPayload(payload);
};

export const fetchErrorLogs = async (datasetId) => {
  const response = await apiClient.get('/api/analytics/errorlogs', { params: { datasetId } });
  return response.data?.data ?? response.data ?? [];
};

export const fetchTimeseriesData = async (limit = 5000, datasetId) => {
  const response = await apiClient.get('/api/analytics/timeseries', {
    params: { limit, datasetId },
  });
  return response.data?.data ?? response.data ?? [];
};

export const fetchDatasetsList = async () => {
  const response = await apiClient.get('/api/analytics/datasets');
  return response.data?.data ?? response.data ?? [];
};

export const fetchUploadStatus = async (datasetId) => {
  const response = await apiClient.get(`/api/datasets/${datasetId}/status`);
  return response.data;
};

