import { Box, Paper, Stack, Typography } from '@mui/material';
import styles from './SummaryCard.module.css';

export default function SummaryCard({ title, value, delta, icon: Icon, accent }) {
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
          <Typography variant="h4" className={styles.value}>
            {value}
          </Typography>
          <Typography variant="body2" className={styles.delta}>
            {delta}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
