import { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import {
  datasetStatus,
  defaultSummaryCards,
  buildSummaryCards,
  graphTabs,
  errorLogRows,
} from './data/dashboardMockData';
import DashboardHeader from './components/header/DashboardHeader';
import SummarySection from './components/summary/SummarySection';
import GraphTabsBar from './components/navigation/GraphTabs';
import GraphWorkspace from './components/graph/GraphWorkspace';
import ErrorLogsTable from './components/tables/ErrorLogsTable';
import DashboardLayout from './components/layout/DashboardLayout';
import { fetchSummaryAnalytics } from './services/analyticsApi';

export default function App() {
  const [summaryCards, setSummaryCards] = useState(defaultSummaryCards);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const summaryData = await fetchSummaryAnalytics();
      setSummaryCards(buildSummaryCards(summaryData));
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load summary analytics';
      setSummaryError(message);
      setSummaryCards(defaultSummaryCards);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <Box>
      <DashboardLayout>
        <DashboardHeader status={datasetStatus} />
        <SummarySection
          cards={summaryCards}
          isLoading={summaryLoading}
          errorMessage={summaryError}
          onRetry={loadSummary}
        />
        <GraphTabsBar tabs={graphTabs} />
        <GraphWorkspace />
        <ErrorLogsTable rows={errorLogRows} />
      </DashboardLayout>
    </Box>
  );
}
