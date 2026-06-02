import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import styles from './SummaryCard.module.css';

export default function SummaryCard({ title, value, delta, icon: Icon, accent, isLoading, hasError }) {
  const valueText = hasError ? '--' : value;
  const deltaText = hasError ? 'unavailable' : delta;

  return (
    <Paper className={styles.card} elevation={0}>
      <Box className={styles.accentLine} style={{ background: accent }} />
      <Stack spacing={2}>
        <Box className={styles.iconWrap} style={{ background: `${accent}22`, color: accent }}>
          <Icon size={22} />
        </Box>
        <Box>
          <Typography variant="overline" className={styles.label}>
            {title}
          </Typography>
          {isLoading ? (
            <>
              <Skeleton variant="text" width="72%" height={44} className={styles.loadingSkeleton} />
              <Skeleton variant="text" width="42%" height={24} className={styles.loadingSkeleton} />
            </>
          ) : (
            <>
              <Typography variant="h4" className={styles.value}>
                {valueText}
              </Typography>
              <Typography variant="body2" className={styles.delta}>
                {deltaText}
              </Typography>
            </>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
