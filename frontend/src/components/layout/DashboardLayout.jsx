import { Container } from '@mui/material';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  return (
    <Container maxWidth="xl" className={styles.pageContainer}>
      {children}
    </Container>
  );
}