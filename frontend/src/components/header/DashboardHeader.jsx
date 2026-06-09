import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { FiDatabase, FiUploadCloud, FiWind } from 'react-icons/fi';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader({ status, onUploadClick }) {
  return (
    <Paper className={styles.headerCard} elevation={0}>
      <Box className={styles.headerGlow} />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack spacing={1.2}>
          <Chip
            icon={<FiWind />}
            label="Wind Energy Intelligence Platform"
            className={styles.overline}
            size="small"
          />
          <Typography variant="h3" className={styles.title}>
            Wind Analytics Dashboard
          </Typography>
          <Typography variant="body1" className={styles.subtitle}>
            Professional overview for wind speed, direction, temperature, humidity, and data quality monitoring.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Chip
            icon={<FiDatabase />}
            label={`${status.label} · ${status.value}`}
            color="success"
            variant="outlined"
            className={styles.statusChip}
          />
          <Button
            variant="contained"
            startIcon={<FiUploadCloud />}
            className={styles.uploadButton}
            onClick={onUploadClick}
          >
            Upload Dataset
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
