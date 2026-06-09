import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Chip,
  Alert,
} from '@mui/material';
import {
  FiTrendingUp,
  FiDatabase,
  FiAlertCircle,
  FiPlay,
  FiSliders,
} from 'react-icons/fi';
import styles from './GraphWorkspace.module.css';

// Lazy load the Plotly component wrapper
const LazyPlot = lazy(() => import('../chart/PlotlyWrapper'));

export default function GraphWorkspace({ activeTab, timeseriesData, isLoading, hasError }) {
  // --- Wind Speed Tab States ---
  const [selectedHeights, setSelectedHeights] = useState({});

  // --- Wind Direction Tab States ---
  const [selectedDirections, setSelectedDirections] = useState({});

  // --- Scatter Analysis States ---
  const [scatterX, setScatterX] = useState('');
  const [scatterY, setScatterY] = useState('');
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [generatedScatterConfig, setGeneratedScatterConfig] = useState(null);

  // --- Additional Metrics States ---
  const [selectedAdditionalMetric, setSelectedAdditionalMetric] = useState('');

  // Extract keys and metadata dynamically from the dataset (Requirement 4)
  const datasetMeta = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) {
      return {
        count: 0,
        startDate: null,
        endDate: null,
        speedKeys: [],
        directionKeys: [],
        additionalKeys: [],
        allMetrics: [],
      };
    }

    const firstRow = timeseriesData[0];
    const rawKeys = firstRow.rawRowData ? Object.keys(firstRow.rawRowData) : [];

    // Helper normalization checks
    const normalize = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSpeed = (key) => {
      const norm = normalize(key);
      return norm.includes('windspeed') || norm.includes('avgms') || norm.includes('speed');
    };
    const isDirection = (key) => {
      const norm = normalize(key);
      return norm.includes('winddirection') || norm.includes('wv') || norm.includes('direction');
    };
    const isTime = (key) => {
      const norm = normalize(key);
      return norm.includes('timestamp') || norm.includes('datetime') || norm === 'date' || norm === 'time';
    };

    // Extract dynamic keys from database document maps
    const speedKeys = new Set();
    const directionKeys = new Set();

    timeseriesData.forEach((row) => {
      if (row.windSpeeds) {
        Object.keys(row.windSpeeds).forEach((k) => speedKeys.add(k));
      }
      if (row.windDirections) {
        Object.keys(row.windDirections).forEach((k) => directionKeys.add(k));
      }
    });

    const speedKeysArr = Array.from(speedKeys);
    const directionKeysArr = Array.from(directionKeys);

    // Filter additional metrics from CSV columns stored in rawRowData (Requirement 3 & 9)
    const excludedBaseKeys = ['humidity', 'temperature', 'timestamp', '_id', 'createdAt', 'updatedAt', '__v'];
    const additionalKeys = rawKeys.filter((key) => {
      if (isTime(key)) return false;
      if (isSpeed(key) || isDirection(key)) return false;
      
      const normKey = normalize(key);
      if (normKey === 'temp5mc' || normKey === 'hum5m' || normKey === 'temperature' || normKey === 'humidity') {
        return false;
      }
      return !excludedBaseKeys.includes(key);
    });

    // Combined list of all metric options for scatter dropdowns
    const allMetrics = [];
    speedKeysArr.forEach((k) => allMetrics.push({ value: `speed.${k}`, label: formatMetricLabel(k) }));
    directionKeysArr.forEach((k) => allMetrics.push({ value: `direction.${k}`, label: formatMetricLabel(k) }));
    
    // Check if temperature and humidity exist in database
    const temperatureExists = timeseriesData.some(d => d.temperature !== undefined && d.temperature !== null);
    const humidityExists = timeseriesData.some(d => d.humidity !== undefined && d.humidity !== null);

    if (temperatureExists) {
      allMetrics.push({ value: 'temperature', label: 'Temperature' });
    }
    if (humidityExists) {
      allMetrics.push({ value: 'humidity', label: 'Humidity' });
    }
    additionalKeys.forEach((k) => allMetrics.push({ value: `additional.${k}`, label: k }));

    return {
      count: timeseriesData.length,
      startDate: timeseriesData[0]?.timestamp,
      endDate: timeseriesData[timeseriesData.length - 1]?.timestamp,
      speedKeys: speedKeysArr,
      directionKeys: directionKeysArr,
      additionalKeys,
      allMetrics,
    };
  }, [timeseriesData]);

  // Synchronize speed check-state dynamically when dataset updates (Requirement 5)
  useEffect(() => {
    if (datasetMeta.speedKeys.length > 0) {
      const initial = {};
      datasetMeta.speedKeys.forEach((key, index) => {
        // Default select the first two heights
        initial[key] = index < 2;
      });
      setSelectedHeights(initial);
    }
  }, [datasetMeta.speedKeys]);

  // Synchronize wind direction check-state dynamically when dataset updates
  useEffect(() => {
    if (datasetMeta.directionKeys.length > 0) {
      const initial = {};
      datasetMeta.directionKeys.forEach((key, index) => {
        // Default select the first direction height
        initial[key] = index === 0;
      });
      setSelectedDirections(initial);
    }
  }, [datasetMeta.directionKeys]);

  // Sync default additional metrics
  useEffect(() => {
    if (datasetMeta.additionalKeys.length > 0 && !selectedAdditionalMetric) {
      setSelectedAdditionalMetric(datasetMeta.additionalKeys[0]);
    }
    if (datasetMeta.allMetrics.length >= 2 && !scatterX) {
      setScatterX(datasetMeta.allMetrics[0]?.value);
      setScatterY(datasetMeta.allMetrics[1]?.value);
    }
  }, [datasetMeta, selectedAdditionalMetric, scatterX]);

  // Print telemetry debugging logs to console on metric/tab selections (Requirement 11)
  useEffect(() => {
    let selectedText = '';
    if (activeTab === 0) {
      selectedText = `Speeds: ${Object.keys(selectedHeights).filter(k => selectedHeights[k]).join(', ')}`;
    } else if (activeTab === 1) {
      selectedText = `Directions: ${Object.keys(selectedDirections).filter(k => selectedDirections[k]).join(', ')}`;
    } else if (activeTab === 2) {
      selectedText = 'Temperature';
    } else if (activeTab === 3) {
      selectedText = 'Humidity';
    } else if (activeTab === 4) {
      selectedText = generatedScatterConfig 
        ? `Scatter [X: ${generatedScatterConfig.xKey}, Y: ${generatedScatterConfig.yKey}]`
        : 'Scatter config pending';
    } else if (activeTab === 5) {
      selectedText = `Additional: ${selectedAdditionalMetric}`;
    }

    console.log('--- Visualization State Selection ---');
    console.log(`Active Tab: ${activeTab}`);
    console.log(`Discovered speed keys: ${datasetMeta.speedKeys.join(', ')}`);
    console.log(`Discovered direction keys: ${datasetMeta.directionKeys.join(', ')}`);
    console.log(`Discovered additional keys: ${datasetMeta.additionalKeys.join(', ')}`);
    console.log(`Selected Metric: ${selectedText}`);
  }, [activeTab, selectedHeights, selectedDirections, selectedAdditionalMetric, generatedScatterConfig, datasetMeta]);

  // Clean metric label formatter
  function formatMetricLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace('windSpeed', 'Wind Speed ')
      .replace('windDirection', 'Wind Direction ')
      .trim();
  }

  // --- Linear Regression Helper for Scatter Analysis ---
  const regressionLine = useMemo(() => {
    if (!generatedScatterConfig || !showTrendLine || !timeseriesData || timeseriesData.length === 0) {
      return null;
    }

    const { xKey, yKey } = generatedScatterConfig;

    const getValue = (row, compositeKey) => {
      if (compositeKey.startsWith('speed.')) {
        return row.windSpeeds?.[compositeKey.replace('speed.', '')];
      }
      if (compositeKey.startsWith('direction.')) {
        return row.windDirections?.[compositeKey.replace('direction.', '')];
      }
      if (compositeKey === 'temperature') {
        return row.temperature;
      }
      if (compositeKey === 'humidity') {
        return row.humidity;
      }
      if (compositeKey.startsWith('additional.')) {
        const rawKey = compositeKey.replace('additional.', '');
        const val = row.rawRowData?.[rawKey];
        return val !== undefined && val !== null ? parseFloat(val) : undefined;
      }
      return undefined;
    };

    const xVals = [];
    const yVals = [];

    timeseriesData.forEach((row) => {
      const xv = getValue(row, xKey);
      const yv = getValue(row, yKey);
      if (xv !== undefined && yv !== undefined && !isNaN(xv) && !isNaN(yv)) {
        xVals.push(xv);
        yVals.push(yv);
      }
    });

    if (xVals.length < 2) return null;

    const n = xVals.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xVals[i];
      sumY += yVals[i];
      sumXY += xVals[i] * yVals[i];
      sumXX += xVals[i] * xVals[i];
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);

    return {
      x: [minX, maxX],
      y: [slope * minX + intercept, slope * maxX + intercept],
      slope,
      intercept,
    };
  }, [timeseriesData, generatedScatterConfig, showTrendLine]);

  // --- Plotly Themes Configuration ---
  const plotlyLayoutDefaults = useMemo(() => {
    return {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'rgba(15, 27, 45, 0.45)',
      font: {
        color: '#eff6ff',
        family: 'Inter, system-ui, sans-serif',
      },
      margin: { t: 40, r: 24, b: 60, l: 60 },
      xaxis: {
        gridcolor: 'rgba(148, 163, 184, 0.08)',
        zerolinecolor: 'rgba(148, 163, 184, 0.12)',
        linecolor: 'rgba(148, 163, 184, 0.15)',
        tickfont: { color: 'rgba(226, 232, 240, 0.6)', size: 10 },
      },
      yaxis: {
        gridcolor: 'rgba(148, 163, 184, 0.08)',
        zerolinecolor: 'rgba(148, 163, 184, 0.12)',
        linecolor: 'rgba(148, 163, 184, 0.15)',
        tickfont: { color: 'rgba(226, 232, 240, 0.6)', size: 10 },
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'right',
        x: 1,
        font: { size: 11, color: '#f8fafc' },
        bgcolor: 'rgba(9, 18, 30, 0.6)',
        bordercolor: 'rgba(148, 163, 184, 0.15)',
        borderwidth: 1,
      },
      hovermode: 'closest',
    };
  }, []);

  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: [], // Keep all zoom, pan, select, reset options (Requirement 7)
    toImageButtonOptions: {
      format: 'png',
      filename: 'wind_platform_chart',
      scale: 2,
    },
  };

  const handleGenerateScatter = () => {
    if (!scatterX || !scatterY) return;
    setGeneratedScatterConfig({ xKey: scatterX, yKey: scatterY });
  };

  // Check if an array of values contains only empty/null items (Requirement 10)
  const isDataEmpty = (values) => {
    if (!values || values.length === 0) return true;
    return values.every(v => v === null || v === undefined || isNaN(v));
  };

  const renderNoDataWarning = (metricName) => {
    return (
      <Box className={styles.emptyState}>
        <FiAlertCircle size={52} className={styles.alertIcon} />
        <Typography variant="h6" className={styles.emptyStateTitle} sx={{ color: '#fb7185' }}>
          No Data Found for Metric
        </Typography>
        <Typography variant="body2" className={styles.emptyStateSubtitle}>
          The metric <strong>{metricName}</strong> exists in the database schema but contains no loaded observations.
        </Typography>
      </Box>
    );
  };

  // --- Rendering Chart Core Logic ---
  const renderChart = () => {
    if (isLoading) {
      return (
        <Box className={styles.chartSkeletonWrapper}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={600} sx={{ borderRadius: '16px', mt: 2 }} />
        </Box>
      );
    }

    if (hasError) {
      return (
        <Box className={styles.emptyState}>
          <FiAlertCircle size={52} className={styles.alertIcon} />
          <Typography variant="h6" className={styles.emptyStateTitle}>
            Connection Error
          </Typography>
          <Typography variant="body2" className={styles.emptyStateSubtitle}>
            Failed to query timeseries database: {String(hasError)}
          </Typography>
        </Box>
      );
    }

    if (!timeseriesData || timeseriesData.length === 0) {
      return (
        <Box className={styles.emptyState}>
          <FiDatabase size={56} className={styles.databaseIcon} />
          <Typography variant="h6" className={styles.emptyStateTitle}>
            No Valid Records Available
          </Typography>
          <Typography variant="body2" className={styles.emptyStateSubtitle}>
            Please upload a CSV dataset containing valid records. Only validated entries in the database are charted.
          </Typography>
        </Box>
      );
    }

    const timestamps = timeseriesData.map((d) => d.timestamp);

    // TAB 0: Wind Speed overlay
    if (activeTab === 0) {
      const traces = [];
      const colors = {
        windSpeed100m: '#6ee7f9',
        windSpeed80m: '#8b5cf6',
        windSpeed50m: '#34d399',
        windSpeed20m: '#f59e0b',
      };

      const activeKeys = Object.keys(selectedHeights).filter(k => selectedHeights[k]);

      if (activeKeys.length === 0) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">Select at least one speed height level above to visualize</Typography>
          </Box>
        );
      }

      // Collect data and check for emptiness
      let allTracesEmpty = true;
      activeKeys.forEach((key) => {
        const values = timeseriesData.map((d) => d.windSpeeds?.[key]);
        if (!isDataEmpty(values)) {
          allTracesEmpty = false;
        }
        traces.push({
          x: timestamps,
          y: values,
          type: 'scatter',
          mode: 'lines',
          name: formatMetricLabel(key),
          line: { color: colors[key] || '#38bdf8', width: 2 },
          hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${formatMetricLabel(key)}:</b> %{y:.2f} m/s<extra></extra>`,
        });
      });

      if (allTracesEmpty) {
        return renderNoDataWarning(activeKeys.map(formatMetricLabel).join(' / '));
      }

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={traces}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: 'Wind Speed (m/s)', font: { size: 12 } },
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 1: Wind Direction
    if (activeTab === 1) {
      const activeKeys = Object.keys(selectedDirections).filter(k => selectedDirections[k]);

      if (activeKeys.length === 0) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">Select at least one wind direction height above to visualize</Typography>
          </Box>
        );
      }

      let allTracesEmpty = true;
      const traces = [];
      const colors = ['#38bdf8', '#fb7185', '#34d399', '#f59e0b'];

      activeKeys.forEach((key, idx) => {
        const values = timeseriesData.map((d) => d.windDirections?.[key]);
        if (!isDataEmpty(values)) {
          allTracesEmpty = false;
        }
        traces.push({
          x: timestamps,
          y: values,
          type: 'scatter',
          mode: 'markers',
          name: formatMetricLabel(key),
          marker: { color: colors[idx % colors.length], size: 5.5, opacity: 0.8 },
          hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${formatMetricLabel(key)}:</b> %{y:.1f}°<extra></extra>`,
        });
      });

      if (allTracesEmpty) {
        return renderNoDataWarning(activeKeys.map(formatMetricLabel).join(' / '));
      }

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={traces}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: 'Wind Direction (Degrees °)', font: { size: 12 } },
                range: [0, 360],
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 2: Temperature
    if (activeTab === 2) {
      const values = timeseriesData.map((d) => d.temperature);
      
      if (isDataEmpty(values)) {
        return renderNoDataWarning('Temperature');
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: 'Temperature',
        line: { color: '#f59e0b', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(245, 158, 11, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>Temp:</b> %{y:.2f} °C<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: 'Temperature (°C)', font: { size: 12 } },
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 3: Humidity
    if (activeTab === 3) {
      const values = timeseriesData.map((d) => d.humidity);

      if (isDataEmpty(values)) {
        return renderNoDataWarning('Humidity');
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: 'Humidity',
        line: { color: '#22d3ee', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(34, 211, 238, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>Humidity:</b> %{y:.2f}%<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: 'Humidity (%)', font: { size: 12 } },
                range: [0, 100],
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 4: Scatter Analysis
    if (activeTab === 4) {
      if (!generatedScatterConfig) {
        return (
          <Box className={styles.emptySelectionState}>
            <FiPlay size={36} style={{ marginBottom: 12, color: '#6ee7f9' }} />
            <Typography variant="body1">Select metrics in the control panel above and click "Generate Plot"</Typography>
          </Box>
        );
      }

      const { xKey, yKey } = generatedScatterConfig;

      const getValue = (row, compositeKey) => {
        if (compositeKey.startsWith('speed.')) {
          return row.windSpeeds?.[compositeKey.replace('speed.', '')];
        }
        if (compositeKey.startsWith('direction.')) {
          return row.windDirections?.[compositeKey.replace('direction.', '')];
        }
        if (compositeKey === 'temperature') {
          return row.temperature;
        }
        if (compositeKey === 'humidity') {
          return row.humidity;
        }
        if (compositeKey.startsWith('additional.')) {
          const rawKey = compositeKey.replace('additional.', '');
          const val = row.rawRowData?.[rawKey];
          return val !== undefined && val !== null ? parseFloat(val) : undefined;
        }
        return undefined;
      };

      const xData = [];
      const yData = [];
      const hoverTexts = [];

      timeseriesData.forEach((row) => {
        const xv = getValue(row, xKey);
        const yv = getValue(row, yKey);
        if (xv !== undefined && yv !== undefined && !isNaN(xv) && !isNaN(yv)) {
          xData.push(xv);
          yData.push(yv);
          const dateStr = new Date(row.timestamp).toLocaleString();
          hoverTexts.push(`Time: ${dateStr}<br>X: ${xv.toFixed(2)}<br>Y: ${yv.toFixed(2)}`);
        }
      });

      if (isDataEmpty(xData) || isDataEmpty(yData)) {
        return renderNoDataWarning(`${xKey} vs ${yKey}`);
      }

      const traces = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'markers',
          name: 'Observations',
          text: hoverTexts,
          hoverinfo: 'text',
          marker: {
            color: 'rgba(110, 231, 249, 0.75)',
            size: 6,
            line: { color: 'rgba(15, 27, 45, 0.8)', width: 1 },
          },
        },
      ];

      if (showTrendLine && regressionLine) {
        traces.push({
          x: regressionLine.x,
          y: regressionLine.y,
          type: 'scatter',
          mode: 'lines',
          name: `Trend (y = ${regressionLine.slope.toFixed(3)}x + ${regressionLine.intercept.toFixed(2)})`,
          line: { color: '#fb7185', width: 2.5, dash: 'dash' },
        });
      }

      const getCleanLabel = (compKey) => {
        const item = datasetMeta.allMetrics.find((m) => m.value === compKey);
        return item ? item.label : compKey;
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={traces}
            layout={{
              ...plotlyLayoutDefaults,
              xaxis: {
                ...plotlyLayoutDefaults.xaxis,
                title: { text: getCleanLabel(xKey), font: { size: 12 } },
              },
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: getCleanLabel(yKey), font: { size: 12 } },
              },
            }}
            config={{
              ...config,
              modeBarButtonsToRemove: [], // Allow lasso & box select
            }}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 5: Additional Metrics
    if (activeTab === 5) {
      if (!selectedAdditionalMetric) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">No additional columns detected in the dataset</Typography>
          </Box>
        );
      }

      const values = timeseriesData.map((d) => {
        const rawVal = d.rawRowData?.[selectedAdditionalMetric];
        return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
      });

      if (isDataEmpty(values)) {
        return renderNoDataWarning(selectedAdditionalMetric);
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: selectedAdditionalMetric,
        line: { color: '#8b5cf6', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(139, 92, 246, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${selectedAdditionalMetric}:</b> %{y:.2f}<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: selectedAdditionalMetric, font: { size: 12 } },
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }
  };

  // Render Horizontal control bar above full page chart (Requirement 6 & 8)
  const renderControlPanel = () => {
    if (!timeseriesData || timeseriesData.length === 0) return null;

    if (activeTab === 0) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Heights overlay
          </Typography>
          <FormGroup row sx={{ gap: 2 }}>
            {datasetMeta.speedKeys.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={Boolean(selectedHeights[key])}
                    onChange={(e) =>
                      setSelectedHeights((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#6ee7f9' } }}
                  />
                }
                label={formatMetricLabel(key)}
                sx={{ color: '#eff6ff' }}
              />
            ))}
          </FormGroup>
        </Paper>
      );
    }

    if (activeTab === 1) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Directions overlay
          </Typography>
          <FormGroup row sx={{ gap: 2 }}>
            {datasetMeta.directionKeys.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={Boolean(selectedDirections[key])}
                    onChange={(e) =>
                      setSelectedDirections((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#38bdf8' } }}
                  />
                }
                label={formatMetricLabel(key)}
                sx={{ color: '#eff6ff' }}
              />
            ))}
          </FormGroup>
        </Paper>
      );
    }

    if (activeTab === 4) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Axes Correlation Settings
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="center" width="100%">
            <FormControl size="small" className={styles.horizontalSelectCtrl} sx={{ minWidth: 200 }}>
              <InputLabel id="x-axis-select-label" sx={{ color: 'rgba(255,255,255,0.5)' }}>X-Axis Metric</InputLabel>
              <Select
                labelId="x-axis-select-label"
                value={scatterX}
                label="X-Axis Metric"
                onChange={(e) => setScatterX(e.target.value)}
                sx={{ borderRadius: '10px' }}
              >
                {datasetMeta.allMetrics.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} disabled={opt.value === scatterY}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" className={styles.horizontalSelectCtrl} sx={{ minWidth: 200 }}>
              <InputLabel id="y-axis-select-label" sx={{ color: 'rgba(255,255,255,0.5)' }}>Y-Axis Metric</InputLabel>
              <Select
                labelId="y-axis-select-label"
                value={scatterY}
                label="Y-Axis Metric"
                onChange={(e) => setScatterY(e.target.value)}
                sx={{ borderRadius: '10px' }}
              >
                {datasetMeta.allMetrics.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} disabled={opt.value === scatterX}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={showTrendLine}
                  onChange={(e) => setShowTrendLine(e.target.checked)}
                  sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#6ee7f9' } }}
                />
              }
              label="Show Trend Line"
              sx={{ color: 'rgba(226,232,240,0.8)' }}
            />

            <Button
              variant="contained"
              onClick={handleGenerateScatter}
              disabled={!scatterX || !scatterY}
              className={styles.horizontalGenerateBtn}
              startIcon={<FiTrendingUp />}
              sx={{ ml: { md: 'auto !important' } }}
            >
              Generate Plot
            </Button>
          </Stack>
        </Paper>
      );
    }

    if (activeTab === 5 && datasetMeta.additionalKeys.length > 0) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Dataset Column Metric
          </Typography>
          <Box className={styles.metricChipsContainer}>
            {datasetMeta.additionalKeys.map((key) => (
              <Chip
                key={key}
                label={key}
                onClick={() => setSelectedAdditionalMetric(key)}
                className={`${styles.metricChip} ${selectedAdditionalMetric === key ? styles.metricChipActive : ''}`}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      );
    }

    return null;
  };

  return (
    <Paper className={styles.workspace} elevation={0}>
      <Stack spacing={3.2}>
        {/* Workspace Title & Layout Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems="center">
          <Box>
            <Typography variant="h5" className={styles.title}>
              {activeTab === 0 && 'Wind Speed Heights overlay'}
              {activeTab === 1 && 'Wind Direction Timeline'}
              {activeTab === 2 && 'Ambient Temperature Timeline'}
              {activeTab === 3 && 'Relative Humidity Timeline'}
              {activeTab === 4 && 'Correlation Scatter Workspace'}
              {activeTab === 5 && 'Dynamic Dataset Column Explorer'}
            </Typography>
            <Typography variant="body2" className={styles.subtitle}>
              {activeTab === 0 && 'Track and overlay wind speeds across multiple heights (100m, 80m, 50m, 20m) simultaneously.'}
              {activeTab === 1 && 'Scatter timeline of wind direction angles (degrees) representing orientation currents.'}
              {activeTab === 2 && 'Timeline tracing ambient temperature variations in Celsius.'}
              {activeTab === 3 && 'Monitoring relative humidity percentages over the dataset observation window.'}
              {activeTab === 4 && 'Explore correlations between any pair of metrics. Includes customizable linear regression trendline overlay.'}
              {activeTab === 5 && 'Plot and visualize remaining columns in the dataset CSV dynamically.'}
            </Typography>
          </Box>

          {/* Dataset Info Card */}
          {timeseriesData && timeseriesData.length > 0 && (
            <Paper className={styles.infoCard} elevation={0}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box className={styles.infoIconWrap}>
                  <FiDatabase size={18} />
                </Box>
                <Box>
                  <Typography className={styles.infoTitle}>
                    {datasetMeta.count.toLocaleString()} Records
                  </Typography>
                  <Typography className={styles.infoDateRange}>
                    {datasetMeta.startDate ? new Date(datasetMeta.startDate).toLocaleDateString() : 'N/A'} -{' '}
                    {datasetMeta.endDate ? new Date(datasetMeta.endDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>

        {/* Tab-Specific Control Panels - Full Width */}
        {renderControlPanel()}

        {/* 100% Full-Width Chart Container (Requirement 6 & 8) */}
        <Box className={styles.chartWrapper}>
          {renderChart()}
        </Box>
      </Stack>
    </Paper>
  );
}
