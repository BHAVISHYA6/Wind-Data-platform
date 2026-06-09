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
import { fetchSummaryAnalytics, fetchErrorLogs } from './services/analyticsApi';

export default function App() {
  const [summaryCards, setSummaryCards] = useState(defaultSummaryCards);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [errorLogs, setErrorLogs] = useState([]);
  const [errorLogsLoading, setErrorLogsLoading] = useState(true);
  const [errorLogsError, setErrorLogsError] = useState('');

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

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const summaryData = await fetchSummaryAnalytics();
      setSummaryCards(buildSummaryCards(summaryData));
      
      const total = summaryData.totalRecords ?? 0;
      setDatasetStatus({
        label: total > 0 ? 'Dataset active' : 'No data uploaded',
        value: `${total.toLocaleString()} rows`,
        tone: total > 0 ? 'success' : 'warning',
      });
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load summary analytics';
      setSummaryError(message);
      setSummaryCards(defaultSummaryCards);
      setDatasetStatus({
        label: 'Error loading stats',
        value: 'N/A',
        tone: 'error',
      });
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadErrorLogs = useCallback(async () => {
    setErrorLogsLoading(true);
    setErrorLogsError('');

    try {
      const logs = await fetchErrorLogs();
      setErrorLogs(logs);
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load error logs';
      setErrorLogsError(message);
      setErrorLogs([]);
    } finally {
      setErrorLogsLoading(false);
    }
  }, []);

  const handleRefreshAll = useCallback(() => {
    loadSummary();
    loadErrorLogs();
  }, [loadSummary, loadErrorLogs]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

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
        />
        <SummarySection
          cards={summaryCards}
          isLoading={summaryLoading}
          errorMessage={summaryError}
          onRetry={loadSummary}
        />
        <GraphTabsBar tabs={graphTabs} />
        <GraphWorkspace />
        
        {/* Render live error logs table */}
        <ErrorLogsTable rows={formattedErrorLogs} />
      </DashboardLayout>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleRefreshAll}
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

