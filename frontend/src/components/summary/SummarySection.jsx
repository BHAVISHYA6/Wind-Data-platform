import { Alert, Box, Button, Stack } from '@mui/material';
import SummaryCard from './SummaryCard';
import styles from './SummarySection.module.css';

export default function SummarySection({ cards, isLoading, errorMessage, onRetry }) {
  return (
    <section className={styles.summarySection}>
      <Stack spacing={1.5} className={styles.summaryMeta}>
        {errorMessage ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            {errorMessage}
          </Alert>
        ) : null}
      </Stack>
      <Box className={styles.summaryGrid}>
        {cards.map((card) => (
          <Box key={card.title} className={styles.summaryCell}>
            <SummaryCard {...card} isLoading={isLoading} hasError={Boolean(errorMessage)} />
          </Box>
        ))}
      </Box>
    </section>
  );
}
