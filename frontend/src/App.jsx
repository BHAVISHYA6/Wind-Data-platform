import { useCallback, useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import {
  defaultSummaryCards,
  buildSummaryCards,
  graphTabs,
} from './data/dashboardMockData';
import DashboardHeader from './components/header/DashboardHeader';
import SummarySection from './components/summary/SummarySection';
import GraphTabsBar from './components/navigation/GraphTabs';
import GraphWorkspace from './components/graph/GraphWorkspace';
import ErrorLogsTable from './components/tables/ErrorLogsTable';
import DashboardLayout from './components/layout/DashboardLayout';
import CsvUploadModal from './components/upload/CsvUploadModal';
import {
  fetchSummaryAnalytics,
  fetchErrorLogs,
  fetchTimeseriesData,
  fetchDatasetsList,
} from './services/analyticsApi';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  // Scoped dataset selector states (Requirement 3 & 4)
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [datasetsList, setDatasetsList] = useState([]);
  const [activeDatasetInfo, setActiveDatasetInfo] = useState({
    name: 'No active dataset',
    timestamp: null,
  });

  const [rawSummaryData, setRawSummaryData] = useState(null);
  const [summaryCards, setSummaryCards] = useState(defaultSummaryCards);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [errorLogs, setErrorLogs] = useState([]);
  const [errorLogsLoading, setErrorLogsLoading] = useState(true);
  const [errorLogsError, setErrorLogsError] = useState('');

  const [timeseriesData, setTimeseriesData] = useState([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(true);
  const [timeseriesError, setTimeseriesError] = useState('');

  const [datasetStatus, setDatasetStatus] = useState({
    label: 'Connecting to DB',
    value: '0 rows',
    tone: 'info',
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    severity: 'success', // 'success' | 'error' | 'info' | 'warning'
    message: '',
  });

  // Keep summary metrics cards reactively synchronized with both summary totals and timeseries details
  useEffect(() => {
    if (rawSummaryData) {
      setSummaryCards(buildSummaryCards(rawSummaryData, timeseriesData));
    }
  }, [rawSummaryData, timeseriesData]);

  const showToast = useCallback(({ severity, message }) => {
    setToast({
      open: true,
      severity,
      message,
    });
  }, []);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Fetch list of all uploaded datasets for the header dropdown
  const loadDatasets = useCallback(async () => {
    try {
      const list = await fetchDatasetsList();
      setDatasetsList(list);
    } catch (error) {
      console.error('Failed to load datasets list:', error);
    }
  }, []);

  // Unified data loader for the active/selected dataset (Requirement 4 & 5)
  const loadAllData = useCallback(async (targetId) => {
    setSummaryLoading(true);
    setSummaryError('');
    setErrorLogsLoading(true);
    setErrorLogsError('');
    setTimeseriesLoading(true);
    setTimeseriesError('');

    try {
      // 1. Fetch summary stats scoped to targetId (falls back to latest on backend if empty)
      const summaryData = await fetchSummaryAnalytics(targetId);
      setRawSummaryData(summaryData);

      // Auto-align the targetId with the database-returned active ID (important for default loads)
      const activeId = summaryData.datasetId;
      if (activeId && targetId !== activeId) {
        setSelectedDatasetId(activeId);
      }

      // Update name and timestamp displays
      setActiveDatasetInfo({
        name: summaryData.datasetName,
        timestamp: summaryData.uploadTimestamp,
      });

      const total = summaryData.totalRecords ?? 0;
      setDatasetStatus({
        label: total > 0 ? 'Dataset active' : 'No data uploaded',
        value: `${total.toLocaleString()} rows`,
        tone: total > 0 ? 'success' : 'warning',
      });

      // 2. Fetch error logs and timeseries data in parallel scoped only to the active ID
      if (activeId) {
        const [logs, timeseries] = await Promise.all([
          fetchErrorLogs(activeId),
          fetchTimeseriesData(5000, activeId),
        ]);
        setErrorLogs(logs);
        setTimeseriesData(timeseries);

        // Debugging logs to console (Requirement 11)
        console.log('--- Scoped Timeseries Debugging ---');
        console.log('Active Dataset Name:', summaryData.datasetName);
        console.log('Active Dataset ID:', activeId);
        console.log('Record count:', timeseries.length);
        if (timeseries.length > 0) {
          console.log('API response fields:', Object.keys(timeseries[0] || {}));
        }
      } else {
        setErrorLogs([]);
        setTimeseriesData([]);
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load dataset analytics';
      setSummaryError(message);
      setRawSummaryData(null);
      setSummaryCards(defaultSummaryCards);
      setDatasetStatus({
        label: 'Error loading stats',
        value: 'N/A',
        tone: 'error',
      });
      setErrorLogs([]);
      setTimeseriesData([]);
    } finally {
      setSummaryLoading(false);
      setErrorLogsLoading(false);
      setTimeseriesLoading(false);
    }
  }, []);

  // Trigger loads when active dataset ID changes
  useEffect(() => {
    loadAllData(selectedDatasetId);
  }, [selectedDatasetId, loadAllData]);

  // Initial load of the datasets dropdown list
  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Auto-switch view to the newly uploaded dataset (Requirement 7)
  const handleUploadSuccess = useCallback(async (newDatasetId) => {
    await loadDatasets();
    if (newDatasetId) {
      setSelectedDatasetId(newDatasetId);
    } else {
      loadAllData(selectedDatasetId);
    }
  }, [loadDatasets, loadAllData, selectedDatasetId]);

  // Format error logs to match expectation of ErrorLogsTable
  const formattedErrorLogs = errorLogs.map((log) => ({
    rowNumber: log.rowNumber,
    validationErrors: Array.isArray(log.validationErrors)
      ? log.validationErrors.join(', ')
      : String(log.validationErrors || ''),
    rawRowData: typeof log.rawRowData === 'object'
      ? JSON.stringify(log.rawRowData)
      : String(log.rawRowData || ''),
  }));

  return (
    <Box>
      <DashboardLayout>
        <DashboardHeader
          status={datasetStatus}
          onUploadClick={() => setIsUploadOpen(true)}
          datasetsList={datasetsList}
          selectedDatasetId={selectedDatasetId}
          onDatasetChange={setSelectedDatasetId}
          activeDatasetInfo={activeDatasetInfo}
        />
        <SummarySection
          cards={summaryCards}
          isLoading={summaryLoading}
          errorMessage={summaryError}
          onRetry={() => loadAllData(selectedDatasetId)}
        />
        <GraphTabsBar
          tabs={graphTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <GraphWorkspace
          activeTab={activeTab}
          timeseriesData={timeseriesData}
          isLoading={timeseriesLoading}
          hasError={timeseriesError}
          summaryData={rawSummaryData}
        />
        
        {/* Render live error logs table */}
        <ErrorLogsTable rows={formattedErrorLogs} />
      </DashboardLayout>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        showToast={showToast}
      />

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


