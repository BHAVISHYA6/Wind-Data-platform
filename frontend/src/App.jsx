import { Box } from '@mui/material';
import { datasetStatus, summaryCards, graphTabs, errorLogRows } from './data/dashboardMockData';
import DashboardHeader from './components/header/DashboardHeader';
import SummarySection from './components/summary/SummarySection';
import GraphTabsBar from './components/navigation/GraphTabs';
import GraphWorkspace from './components/graph/GraphWorkspace';
import ErrorLogsTable from './components/tables/ErrorLogsTable';
import DashboardLayout from './components/layout/DashboardLayout';

export default function App() {
  return (
    <Box>
      <DashboardLayout>
        <DashboardHeader status={datasetStatus} />
        <SummarySection cards={summaryCards} />
        <GraphTabsBar tabs={graphTabs} />
        <GraphWorkspace />
        <ErrorLogsTable rows={errorLogRows} />
      </DashboardLayout>
    </Box>
  );
}
