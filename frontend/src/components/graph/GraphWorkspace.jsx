import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { FiDownload, FiMaximize2, FiRefreshCw, FiZoomIn } from 'react-icons/fi';
import styles from './GraphWorkspace.module.css';

export default function GraphWorkspace() {
  return (
    <Paper className={styles.workspace} elevation={0}>
      <Stack spacing={2.2}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" className={styles.title}>
              Main Graph Workspace
            </Typography>
            <Typography variant="body2" className={styles.subtitle}>
              Large chart container placeholder for wind analysis, comparative metrics, and responsive data exploration.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<FiZoomIn />}>Zoom</Button>
            <Button variant="outlined" startIcon={<FiRefreshCw />}>Reset</Button>
            <Button variant="contained" startIcon={<FiDownload />}>Download</Button>
            <Button variant="outlined" startIcon={<FiMaximize2 />}>Expand</Button>
          </Stack>
        </Stack>

        <Box className={styles.chartPlaceholder}>
          <Typography variant="h6">Chart Placeholder</Typography>
          <Typography variant="body2">
            Integrate your charting library here. This space is reserved for large responsive plots and time-series panels.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
