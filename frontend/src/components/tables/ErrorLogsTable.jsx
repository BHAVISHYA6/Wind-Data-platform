import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import styles from './ErrorLogsTable.module.css';

export default function ErrorLogsTable({ rows }) {
  return (
    <Paper className={styles.tableCard} elevation={0}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5" className={styles.title}>
            Error Logs
          </Typography>
          <Typography variant="body2" className={styles.subtitle}>
            Table placeholder for invalid row tracking, validation diagnostics, and raw input review.
          </Typography>
        </Stack>

        <TableContainer className={styles.tableContainer}>
          <Table stickyHeader aria-label="error logs placeholder table">
            <TableHead>
              <TableRow>
                <TableCell>Row Number</TableCell>
                <TableCell>Validation Errors</TableCell>
                <TableCell>Raw Row Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowNumber} hover>
                  <TableCell>
                    <Chip label={`Row ${row.rowNumber}`} size="small" className={styles.rowChip} />
                  </TableCell>
                  <TableCell>{row.validationErrors}</TableCell>
                  <TableCell>{row.rawRowData}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
}
