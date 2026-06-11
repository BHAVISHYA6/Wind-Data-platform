import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
} from '@mui/material';
import {
  FiUploadCloud,
  FiFileText,
  FiTrash2,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiLoader,
} from 'react-icons/fi';
import { apiClient, fetchUploadStatus } from '../../services/analyticsApi';
import { getSocket } from '../../services/socket';
import styles from './CsvUploadModal.module.css';

const stagesList = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'processing', label: 'Processing' },
  { key: 'validating', label: 'Validating' },
  { key: 'saving', label: 'Saving' },
];

const stageOrder = ['uploading', 'processing', 'validating', 'saving', 'completed'];

const failedStageKeyMap = {
  initialization: 'Uploading',
  processing: 'Processing',
  validation: 'Validating',
  validating: 'Validating',
  saving: 'Saving',
};

export default function CsvUploadModal({ open, onClose, onUploadSuccess, showToast }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'ready' | 'uploading' | 'success' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [errorDetails, setErrorDetails] = useState('');
  const [currentProcessingStage, setCurrentProcessingStage] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'validating' | 'saving' | 'completed'
  const [failedStage, setFailedStage] = useState('');

  const inputRef = useRef(null);
  const socketCleanupRef = useRef(null);

  // Reset modal state on close/open
  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  // Clean up socket listener on unmount
  useEffect(() => {
    return () => {
      if (socketCleanupRef.current) {
        socketCleanupRef.current();
      }
    };
  }, []);

  const resetState = () => {
    if (socketCleanupRef.current) {
      socketCleanupRef.current();
      socketCleanupRef.current = null;
    }
    setFile(null);
    setDragActive(false);
    setUploadStatus('idle');
    setUploadProgress(0);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setUploadSummary(null);
    setErrorDetails('');
    setCurrentProcessingStage('idle');
    setFailedStage('');
  };

  const startStatusListening = (datasetId) => {
    if (socketCleanupRef.current) {
      socketCleanupRef.current();
    }

    const socket = getSocket();

    // Subscribe to specific dataset updates room
    socket.emit('subscribe', datasetId);

    const handleProgress = (data) => {
      if (data.datasetId !== datasetId) return;

      setUploadProgress(data.progressPercentage || 0);

      let mappedStage = 'processing';
      if (data.stage === 'validating') {
        mappedStage = 'validating';
      } else if (data.stage === 'saving') {
        mappedStage = 'saving';
      }
      setCurrentProcessingStage(mappedStage);
    };

    const handleCompleted = (data) => {
      if (data.datasetId !== datasetId) return;

      cleanup();

      setUploadSummary({
        totalRows: data.totalRows ?? 0,
        validRows: data.validRows ?? 0,
        invalidRows: data.invalidRows ?? 0,
        processingTime: data.processingTime,
      });
      setUploadStatus('success');
      setCurrentProcessingStage('completed');
      setUploadProgress(100);

      showToast({
        severity: 'success',
        message: `Successfully uploaded dataset: ${data.validRows ?? 0} valid rows imported!`,
      });

      if (onUploadSuccess) {
        onUploadSuccess(datasetId);
      }
    };

    const handleFailed = (data) => {
      if (data.datasetId !== datasetId) return;

      cleanup();

      setErrorDetails(data.errorDetails || 'Failed to process CSV file');
      setFailedStage(data.stage || '');
      setUploadStatus('error');
      showToast({
        severity: 'error',
        message: `Processing failed: ${data.errorDetails || 'Error occurred during processing'}`,
      });
    };

    const cleanup = () => {
      socket.off('uploadProgress', handleProgress);
      socket.off('uploadCompleted', handleCompleted);
      socket.off('uploadFailed', handleFailed);
      socket.emit('unsubscribe', datasetId);
    };

    socket.on('uploadProgress', handleProgress);
    socket.on('uploadCompleted', handleCompleted);
    socket.on('uploadFailed', handleFailed);

    socketCleanupRef.current = cleanup;
  };

  // Simple CSV parser for browser preview
  const handleCSVPreview = (fileObject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }

        // Helper to parse line handling double quotes
        const parseLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1, 6).map((line) => parseLine(line));

        setPreviewHeaders(headers);
        setPreviewRows(rows);
        setUploadStatus('ready');
      } catch (err) {
        setErrorDetails('Failed to parse file preview. Make sure it is a valid CSV.');
        setUploadStatus('idle');
        setFile(null);
      }
    };
    reader.readAsText(fileObject);
  };

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;

    // Verify it is a CSV
    const isCsv =
      selectedFile.type === 'text/csv' ||
      selectedFile.name.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      setErrorDetails('Unsupported file format. Please upload a CSV (.csv) file.');
      showToast({ severity: 'error', message: 'Only CSV files are allowed' });
      return;
    }

    setErrorDetails('');
    setFile(selectedFile);
    handleCSVPreview(selectedFile);
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    inputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    resetState();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setCurrentProcessingStage('uploading');
    setFailedStage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percentCompleted);
          if (percentCompleted < 100) {
            setCurrentProcessingStage('uploading');
          } else {
            setCurrentProcessingStage('processing');
          }
        },
      });

      if (response.data && response.data.success) {
        const datasetId = response.data.datasetId;
        startStatusListening(datasetId);
      } else {
        throw new Error(response.data?.message || 'Server did not report success');
      }
    } catch (error) {
      console.error('File upload error:', error);
      const serverMessage = error.response?.data?.message || error.message || 'Error occurred during upload';
      const serverStage = error.response?.data?.stage || '';
      
      setErrorDetails(serverMessage);
      setFailedStage(serverStage);
      setUploadStatus('error');
      showToast({
        severity: 'error',
        message: `Upload failed: ${serverMessage}`,
      });
    }
  };

  // Format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <Dialog
      open={open}
      onClose={uploadStatus === 'uploading' ? null : onClose}
      maxWidth="md"
      fullWidth
      className={styles.dialogWrapper}
      PaperProps={{
        className: styles.dialogPaper,
        elevation: 0,
      }}
    >
      <DialogTitle className={styles.dialogHeader}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" className={styles.headerTitle}>
            Upload Wind Dataset
          </Typography>
          {uploadStatus !== 'uploading' && (
            <IconButton onClick={onClose} className={styles.closeBtn}>
              <FiX />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent className={styles.dialogContent}>
        {/* Error Alert inside modal */}
        {errorDetails && uploadStatus !== 'error' && (
          <Alert severity="error" className={styles.errorAlert}>
            {errorDetails}
          </Alert>
        )}

        {/* Stage 1: Dropzone */}
        {uploadStatus === 'idle' && (
          <Box
            className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input
              type="file"
              ref={inputRef}
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <Stack spacing={2} alignItems="center" justifyContent="center">
              <Box className={styles.uploadIconWrap}>
                <FiUploadCloud className={styles.uploadIcon} />
              </Box>
              <Typography variant="h6" className={styles.uploadTitle}>
                Drag & drop your CSV file here
              </Typography>
              <Typography variant="body2" className={styles.uploadSubtitle}>
                or <span className={styles.browseText}>browse your computer</span>
              </Typography>
              <Typography variant="caption" className={styles.uploadLimit}>
                Supports only standard format CSV files (.csv)
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Stage 2: Preview & Info */}
        {uploadStatus === 'ready' && file && (
          <Stack spacing={3}>
            <Paper className={styles.fileCard} elevation={0}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box className={styles.fileIconWrap}>
                    <FiFileText size={24} />
                  </Box>
                  <Box>
                    <Typography className={styles.fileName}>{file.name}</Typography>
                    <Typography className={styles.fileSize}>{formatBytes(file.size)}</Typography>
                  </Box>
                </Stack>
                <IconButton onClick={handleRemoveFile} className={styles.removeBtn}>
                  <FiTrash2 />
                </IconButton>
              </Stack>
            </Paper>

            <Typography variant="subtitle1" className={styles.previewTitle}>
              Data Preview (First 5 Rows)
            </Typography>

            <TableContainer component={Paper} className={styles.previewTableContainer} elevation={0}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {previewHeaders.map((header, index) => (
                      <TableCell key={index} className={styles.previewTableHeader}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className={styles.previewTableRow}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className={styles.previewTableCell}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {/* Stage 3: Uploading Progress */}
        {uploadStatus === 'uploading' && file && (
          <Box className={styles.progressContainer}>
            <Stack spacing={3} alignItems="center">
              <Box className={styles.spinnerWrap}>
                <FiLoader className={styles.uploadSpinner} />
              </Box>
              <Typography variant="h6" className={styles.progressTitle}>
                {currentProcessingStage === 'uploading' && `Uploading file... (${uploadProgress}%)`}
                {currentProcessingStage === 'processing' && 'Processing CSV content...'}
                {currentProcessingStage === 'validating' && 'Validating wind records...'}
                {currentProcessingStage === 'saving' && 'Saving to database...'}
                {currentProcessingStage === 'completed' && 'Processing completed!'}
              </Typography>
              <Box className={styles.progressBarWrapper}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  className={styles.progressBar}
                />
                <Typography className={styles.progressPercent}>{uploadProgress}%</Typography>
              </Box>
              <Typography variant="body2" className={styles.progressFilename}>
                Processing: {file.name} ({formatBytes(file.size)})
              </Typography>

              {/* Progress Steps List */}
              <Box className={styles.stagesListWrapper}>
                <Stack spacing={2} alignSelf="stretch" sx={{ width: '100%', minWidth: '280px', mt: 1 }}>
                  {stagesList.map((stage) => {
                    const idx = stageOrder.indexOf(currentProcessingStage);
                    const stageIdx = stageOrder.indexOf(stage.key);
                    const isCompleted = idx > stageIdx;
                    const isActive = currentProcessingStage === stage.key;

                    let statusIcon;
                    let statusClass = styles.stagePending;

                    if (isCompleted) {
                      statusIcon = <FiCheckCircle className={styles.stageCheckIcon} />;
                      statusClass = styles.stageCompleted;
                    } else if (isActive) {
                      statusIcon = <FiLoader className={styles.stageSpinnerIcon} />;
                      statusClass = styles.stageActive;
                    } else {
                      statusIcon = <Box className={styles.stagePendingDot} />;
                      statusClass = styles.stagePending;
                    }

                    return (
                      <Stack
                        key={stage.key}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        className={`${styles.stageItem} ${statusClass}`}
                      >
                        {statusIcon}
                        <Typography className={styles.stageLabel}>{stage.label}</Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Stage 4: Upload Success Summary */}
        {uploadStatus === 'success' && uploadSummary && (
          <Box className={styles.summaryContainer}>
            <Stack spacing={4} alignItems="center">
              <Box className={styles.successIconWrap}>
                <FiCheckCircle className={styles.successIcon} />
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" className={styles.successTitle}>
                  Upload Completed!
                </Typography>
                <Typography variant="body1" className={styles.successSubtitle}>
                  Your wind analytics dataset has been processed and saved successfully.
                </Typography>
              </Box>

              <GridContainer>
                <SummaryItem
                  label="Total Rows"
                  value={uploadSummary.totalRows}
                  color="#60a5fa"
                />
                <SummaryItem
                  label="Valid Rows"
                  value={uploadSummary.validRows}
                  color="#34d399"
                  isSuccess
                />
                <SummaryItem
                  label="Invalid Rows"
                  value={uploadSummary.invalidRows}
                  color="#fb7185"
                  isWarning={uploadSummary.invalidRows > 0}
                />
              </GridContainer>

              {uploadSummary.processingTime && (
                <Box className={styles.benchmarksWrapper} width="100%">
                  <Typography variant="subtitle2" className={styles.benchmarksTitle}>
                    Processing Benchmarks
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} className={styles.benchmarksGrid}>
                    <Box className={styles.benchmarkCard}>
                      <Typography className={styles.benchmarkLabel}>Parsing CSV</Typography>
                      <Typography className={styles.benchmarkValue}>
                        {uploadSummary.processingTime.parsing != null ? `${uploadSummary.processingTime.parsing.toFixed(1)} ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box className={styles.benchmarkCard}>
                      <Typography className={styles.benchmarkLabel}>Validation</Typography>
                      <Typography className={styles.benchmarkValue}>
                        {uploadSummary.processingTime.validation != null ? `${uploadSummary.processingTime.validation.toFixed(1)} ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box className={styles.benchmarkCard}>
                      <Typography className={styles.benchmarkLabel}>Saving to DB</Typography>
                      <Typography className={styles.benchmarkValue}>
                        {uploadSummary.processingTime.saving != null ? `${uploadSummary.processingTime.saving.toFixed(1)} ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box className={styles.benchmarkCard}>
                      <Typography className={styles.benchmarkLabel}>Total Time</Typography>
                      <Typography className={styles.benchmarkValue}>
                        {uploadSummary.processingTime.total != null ? `${(uploadSummary.processingTime.total / 1000).toFixed(2)} s` : 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              {uploadSummary.invalidRows > 0 && (
                <Alert severity="warning" className={styles.warningAlert}>
                  {uploadSummary.invalidRows} records contained validation errors and were routed to the Error Logs at the bottom of the dashboard.
                </Alert>
              )}
            </Stack>
          </Box>
        )}

        {/* Stage 5: Upload Error */}
        {uploadStatus === 'error' && (
          <Box className={styles.summaryContainer}>
            <Stack spacing={4} alignItems="center">
              <Box className={styles.errorIconWrap}>
                <FiAlertTriangle className={styles.errorIcon} />
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" className={styles.errorTitle}>
                  Upload Failed
                </Typography>
                <Typography variant="body1" className={styles.successSubtitle}>
                  We encountered an error while processing the uploaded CSV file.
                </Typography>
              </Box>

              <Alert severity="error" className={styles.fullErrorAlert}>
                {failedStage && (
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    Failed Stage: <span style={{ color: '#fda4af', fontWeight: 800 }}>{failedStageKeyMap[failedStage] || failedStage}</span>
                  </Typography>
                )}
                <Typography variant="subtitle2" fontWeight={700}>
                  Diagnostic Message:
                </Typography>
                <Typography variant="body2" className={styles.errorPre}>
                  {errorDetails}
                </Typography>
              </Alert>

              <Button
                variant="contained"
                onClick={resetState}
                className={styles.retryBtn}
              >
                Try Again
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions className={styles.dialogActions}>
        {uploadStatus !== 'uploading' && (
          <Button onClick={onClose} className={styles.cancelBtn}>
            {uploadStatus === 'success' ? 'Close' : 'Cancel'}
          </Button>
        )}

        {uploadStatus === 'ready' && (
          <Button onClick={handleUpload} variant="contained" className={styles.actionBtn}>
            Upload Dataset
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Inline mini-helper components for grid summary formatting
function GridContainer({ children }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      className={styles.summaryGrid}
      justifyContent="center"
      alignItems="stretch"
      width="100%"
    >
      {children}
    </Stack>
  );
}

function SummaryItem({ label, value, color, isSuccess, isWarning }) {
  return (
    <Paper className={styles.summaryItemCard} elevation={0} style={{ borderTop: `4px solid ${color}` }}>
      <Typography variant="overline" className={styles.summaryItemLabel}>
        {label}
      </Typography>
      <Typography variant="h4" className={styles.summaryItemValue}>
        {value.toLocaleString()}
      </Typography>
      {isSuccess && (
        <Typography variant="caption" className={styles.summaryItemBadgeSuccess}>
          Imported to Analytics
        </Typography>
      )}
      {isWarning && (
        <Typography variant="caption" className={styles.summaryItemBadgeWarning}>
          Logged to diagnostics
        </Typography>
      )}
    </Paper>
  );
}
