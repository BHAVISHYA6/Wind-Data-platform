import { Box } from '@mui/material';
import SummaryCard from './SummaryCard';
import styles from './SummarySection.module.css';

export default function SummarySection({ cards }) {
  return (
    <section className={styles.summarySection}>
      <Box className={styles.summaryGrid}>
        {cards.map((card) => (
          <Box key={card.title} className={styles.summaryCell}>
            <SummaryCard {...card} />
          </Box>
        ))}
      </Box>
    </section>
  );
}
