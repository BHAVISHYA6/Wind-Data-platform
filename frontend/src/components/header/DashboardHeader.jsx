import { Box, Button, Chip, Paper, Stack, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { FiDatabase, FiUploadCloud, FiWind, FiCalendar } from 'react-icons/fi';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader({
  status,
  onUploadClick,
  datasetsList = [],
  selectedDatasetId = '',
  onDatasetChange,
  activeDatasetInfo = {},
}) {
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
          
          {activeDatasetInfo && activeDatasetInfo.name && activeDatasetInfo.name !== 'No active dataset' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: '4px !important' }}>
              <Typography variant="caption" sx={{ color: '#6ee7f9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FiDatabase size={13} /> Selected Dataset: {activeDatasetInfo.name}
              </Typography>
              {activeDatasetInfo.timestamp && (
                <Typography variant="caption" sx={{ color: 'rgba(226, 232, 240, 0.45)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FiCalendar size={13} /> Uploaded: {new Date(activeDatasetInfo.timestamp).toLocaleString()}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          {datasetsList.length > 0 && (
            <FormControl size="small" variant="outlined" sx={{ minWidth: 200, background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <Select
                value={selectedDatasetId}
                onChange={(e) => onDatasetChange && onDatasetChange(e.target.value)}
                displayEmpty
                sx={{
                  color: '#eff6ff',
                  borderRadius: '10px',
                  height: '38px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.35)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6ee7f9' },
                }}
              >
                {datasetsList.map((ds) => (
                  <MenuItem key={ds._id} value={ds._id} sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {ds.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

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
