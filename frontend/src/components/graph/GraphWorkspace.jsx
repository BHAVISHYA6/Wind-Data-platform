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
  const [selectedSpeedCols, setSelectedSpeedCols] = useState({});

  // --- Wind Direction Tab States ---
  const [selectedDirectionCols, setSelectedDirectionCols] = useState({});

  // --- Temperature Tab States ---
  const [selectedTempCol, setSelectedTempCol] = useState('');

  // --- Humidity Tab States ---
  const [selectedHumidityCol, setSelectedHumidityCol] = useState('');

  // --- Pressure Tab States ---
  const [selectedPressureCol, setSelectedPressureCol] = useState('');

  // --- Scatter Analysis States ---
  const [scatterX, setScatterX] = useState('');
  const [scatterY, setScatterY] = useState('');
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [generatedScatterConfig, setGeneratedScatterConfig] = useState(null);

  // --- Additional Metrics States ---
  const [selectedAdditionalCol, setSelectedAdditionalCol] = useState('');

  // Extract keys and metadata dynamically from the rawRowData of dataset records
  const datasetMeta = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) {
      return {
        count: 0,
        startDate: null,
        endDate: null,
        windSpeedCols: [],
        windDirectionCols: [],
        temperatureCols: [],
        humidityCols: [],
        pressureCols: [],
        additionalCols: [],
        allMetricCols: [],
      };
    }

    const firstRow = timeseriesData[0];
    const rawKeys = firstRow.rawRowData ? Object.keys(firstRow.rawRowData) : [];

    const windSpeedCols = [];
    const windDirectionCols = [];
    const temperatureCols = [];
    const humidityCols = [];
    const pressureCols = [];
    const additionalCols = [];

    rawKeys.forEach((key) => {
      const lowerKey = key.toLowerCase();
      // Skip date/time columns
      if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey === 'timestamp') {
        return;
      }

      if (key.includes('[m/s]')) {
        windSpeedCols.push(key);
      } else if (key.includes('[°]')) {
        windDirectionCols.push(key);
      } else if (key.includes('[°C]')) {
        temperatureCols.push(key);
      } else if (key.includes('[%]')) {
        humidityCols.push(key);
      } else if (key.includes('[mbar]')) {
        pressureCols.push(key);
      } else {
        additionalCols.push(key);
      }
    });

    const allMetricCols = [
      ...windSpeedCols,
      ...windDirectionCols,
      ...temperatureCols,
      ...humidityCols,
      ...pressureCols,
      ...additionalCols,
    ];

    return {
      count: timeseriesData.length,
      startDate: timeseriesData[0]?.timestamp,
      endDate: timeseriesData[timeseriesData.length - 1]?.timestamp,
      windSpeedCols,
      windDirectionCols,
      temperatureCols,
      humidityCols,
      pressureCols,
      additionalCols,
      allMetricCols,
    };
  }, [timeseriesData]);

  // Synchronize speed check-state dynamically when dataset updates (selecting first column by default)
  useEffect(() => {
    if (datasetMeta.windSpeedCols.length > 0) {
      const initial = {};
      datasetMeta.windSpeedCols.forEach((col, index) => {
        initial[col] = index === 0;
      });
      setSelectedSpeedCols(initial);
    }
  }, [datasetMeta.windSpeedCols]);

  // Synchronize wind direction check-state dynamically when dataset updates
  useEffect(() => {
    if (datasetMeta.windDirectionCols.length > 0) {
      const initial = {};
      datasetMeta.windDirectionCols.forEach((col, index) => {
        initial[col] = index === 0;
      });
      setSelectedDirectionCols(initial);
    }
  }, [datasetMeta.windDirectionCols]);

  // Sync Temperature, Humidity, Pressure and Additional columns
  useEffect(() => {
    if (datasetMeta.temperatureCols.length > 0) {
      setSelectedTempCol(datasetMeta.temperatureCols[0]);
    }
    if (datasetMeta.humidityCols.length > 0) {
      setSelectedHumidityCol(datasetMeta.humidityCols[0]);
    }
    if (datasetMeta.pressureCols.length > 0) {
      setSelectedPressureCol(datasetMeta.pressureCols[0]);
    }
    if (datasetMeta.additionalCols.length > 0) {
      setSelectedAdditionalCol(datasetMeta.additionalCols[0]);
    }
  }, [datasetMeta.temperatureCols, datasetMeta.humidityCols, datasetMeta.pressureCols, datasetMeta.additionalCols]);

  // Sync Scatter inputs
  useEffect(() => {
    if (datasetMeta.allMetricCols.length >= 2 && !scatterX) {
      setScatterX(datasetMeta.allMetricCols[0]);
      setScatterY(datasetMeta.allMetricCols[1]);
    }
  }, [datasetMeta.allMetricCols, scatterX]);

  // Print telemetry debugging logs to console on metric/tab selections
  useEffect(() => {
    let selectedText = '';
    if (activeTab === 0) {
      selectedText = `Speeds: ${Object.keys(selectedSpeedCols).filter(k => selectedSpeedCols[k]).join(', ')}`;
    } else if (activeTab === 1) {
      selectedText = `Directions: ${Object.keys(selectedDirectionCols).filter(k => selectedDirectionCols[k]).join(', ')}`;
    } else if (activeTab === 2) {
      selectedText = `Temperature: ${selectedTempCol}`;
    } else if (activeTab === 3) {
      selectedText = `Humidity: ${selectedHumidityCol}`;
    } else if (activeTab === 4) {
      selectedText = `Pressure: ${selectedPressureCol}`;
    } else if (activeTab === 5) {
      selectedText = generatedScatterConfig 
        ? `Scatter [X: ${generatedScatterConfig.xKey}, Y: ${generatedScatterConfig.yKey}]`
        : 'Scatter config pending';
    } else if (activeTab === 6) {
      selectedText = `Additional: ${selectedAdditionalCol}`;
    }

    console.log('--- Visualization State Selection ---');
    console.log(`Active Tab: ${activeTab}`);
    console.log(`Discovered speed columns: ${datasetMeta.windSpeedCols.join(', ')}`);
    console.log(`Discovered direction columns: ${datasetMeta.windDirectionCols.join(', ')}`);
    console.log(`Selected Metric: ${selectedText}`);
  }, [activeTab, selectedSpeedCols, selectedDirectionCols, selectedTempCol, selectedHumidityCol, selectedPressureCol, selectedAdditionalCol, generatedScatterConfig, datasetMeta]);

  // --- Linear Regression Helper for Scatter Analysis ---
  const regressionLine = useMemo(() => {
    if (!generatedScatterConfig || !showTrendLine || !timeseriesData || timeseriesData.length === 0) {
      return null;
    }

    const { xKey, yKey } = generatedScatterConfig;

    const getValue = (row, key) => {
      const val = row.rawRowData?.[key];
      return val !== undefined && val !== null ? parseFloat(val) : undefined;
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

  // --- Dynamic Selection Lists & Stats Computation ---
  const activeMetrics = useMemo(() => {
    if (activeTab === 0) {
      return Object.keys(selectedSpeedCols).filter(col => selectedSpeedCols[col]);
    }
    if (activeTab === 1) {
      return Object.keys(selectedDirectionCols).filter(col => selectedDirectionCols[col]);
    }
    if (activeTab === 2) {
      return selectedTempCol ? [selectedTempCol] : [];
    }
    if (activeTab === 3) {
      return selectedHumidityCol ? [selectedHumidityCol] : [];
    }
    if (activeTab === 4) {
      return selectedPressureCol ? [selectedPressureCol] : [];
    }
    if (activeTab === 6) {
      return selectedAdditionalCol ? [selectedAdditionalCol] : [];
    }
    return [];
  }, [activeTab, selectedSpeedCols, selectedDirectionCols, selectedTempCol, selectedHumidityCol, selectedPressureCol, selectedAdditionalCol]);

  const metricsStats = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0 || activeMetrics.length === 0) {
      return {};
    }

    const stats = {};
    activeMetrics.forEach((metric) => {
      let min = Infinity;
      let max = -Infinity;
      let hasValue = false;

      timeseriesData.forEach((row) => {
        const val = row.rawRowData?.[metric];
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (Number.isFinite(num)) {
            if (num < min) min = num;
            if (num > max) max = num;
            hasValue = true;
          }
        }
      });

      stats[metric] = {
        min: hasValue ? parseFloat(min.toFixed(2)) : 'N/A',
        max: hasValue ? parseFloat(max.toFixed(2)) : 'N/A',
      };
    });

    return stats;
  }, [timeseriesData, activeMetrics]);

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

  const CHART_COLORS = ['#6ee7f9', '#8b5cf6', '#34d399', '#f59e0b', '#38bdf8', '#fb7185', '#ec4899', '#10b981'];

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
      const activeKeys = Object.keys(selectedSpeedCols).filter(k => selectedSpeedCols[k]);

      if (activeKeys.length === 0) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">Select at least one speed column above to visualize</Typography>
          </Box>
        );
      }

      let allTracesEmpty = true;
      const traces = [];
      activeKeys.forEach((key, idx) => {
        const values = timeseriesData.map((d) => {
          const rawVal = d.rawRowData?.[key];
          return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
        });
        if (!isDataEmpty(values)) {
          allTracesEmpty = false;
        }
        traces.push({
          x: timestamps,
          y: values,
          type: 'scatter',
          mode: 'lines',
          name: key,
          line: { color: CHART_COLORS[idx % CHART_COLORS.length], width: 2 },
          hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${key}:</b> %{y:.2f} m/s<extra></extra>`,
        });
      });

      if (allTracesEmpty) {
        return renderNoDataWarning(activeKeys.join(' / '));
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
      const activeKeys = Object.keys(selectedDirectionCols).filter(k => selectedDirectionCols[k]);

      if (activeKeys.length === 0) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">Select at least one wind direction column above to visualize</Typography>
          </Box>
        );
      }

      let allTracesEmpty = true;
      const traces = [];
      activeKeys.forEach((key, idx) => {
        const values = timeseriesData.map((d) => {
          const rawVal = d.rawRowData?.[key];
          return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
        });
        if (!isDataEmpty(values)) {
          allTracesEmpty = false;
        }
        traces.push({
          x: timestamps,
          y: values,
          type: 'scatter',
          mode: 'markers',
          name: key,
          marker: { color: CHART_COLORS[idx % CHART_COLORS.length], size: 5.5, opacity: 0.8 },
          hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${key}:</b> %{y:.1f}°<extra></extra>`,
        });
      });

      if (allTracesEmpty) {
        return renderNoDataWarning(activeKeys.join(' / '));
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
      if (!selectedTempCol) {
        return renderNoDataWarning('Temperature');
      }
      const values = timeseriesData.map((d) => {
        const rawVal = d.rawRowData?.[selectedTempCol];
        return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
      });
      
      if (isDataEmpty(values)) {
        return renderNoDataWarning(selectedTempCol);
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: selectedTempCol,
        line: { color: '#f59e0b', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(245, 158, 11, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${selectedTempCol}:</b> %{y:.2f} °C<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: selectedTempCol, font: { size: 12 } },
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
      if (!selectedHumidityCol) {
        return renderNoDataWarning('Humidity');
      }
      const values = timeseriesData.map((d) => {
        const rawVal = d.rawRowData?.[selectedHumidityCol];
        return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
      });

      if (isDataEmpty(values)) {
        return renderNoDataWarning(selectedHumidityCol);
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: selectedHumidityCol,
        line: { color: '#22d3ee', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(34, 211, 238, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${selectedHumidityCol}:</b> %{y:.2f}%<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: selectedHumidityCol, font: { size: 12 } },
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

    // TAB 4: Pressure
    if (activeTab === 4) {
      if (!selectedPressureCol) {
        return renderNoDataWarning('Pressure');
      }
      const values = timeseriesData.map((d) => {
        const rawVal = d.rawRowData?.[selectedPressureCol];
        return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
      });

      if (isDataEmpty(values)) {
        return renderNoDataWarning(selectedPressureCol);
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: selectedPressureCol,
        line: { color: '#ec4899', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(236, 72, 153, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${selectedPressureCol}:</b> %{y:.2f} mbar<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: selectedPressureCol, font: { size: 12 } },
              },
            }}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // TAB 5: Scatter Analysis
    if (activeTab === 5) {
      if (!generatedScatterConfig) {
        return (
          <Box className={styles.emptySelectionState}>
            <FiPlay size={36} style={{ marginBottom: 12, color: '#6ee7f9' }} />
            <Typography variant="body1">Select metrics in the control panel above and click "Generate Plot"</Typography>
          </Box>
        );
      }

      const { xKey, yKey } = generatedScatterConfig;

      const getValue = (row, key) => {
        const val = row.rawRowData?.[key];
        return val !== undefined && val !== null ? parseFloat(val) : undefined;
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
          hoverTexts.push(`Time: ${dateStr}<br>${xKey}: ${xv.toFixed(2)}<br>${yKey}: ${yv.toFixed(2)}`);
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

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={traces}
            layout={{
              ...plotlyLayoutDefaults,
              xaxis: {
                ...plotlyLayoutDefaults.xaxis,
                title: { text: xKey, font: { size: 12 } },
              },
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: yKey, font: { size: 12 } },
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

    // TAB 6: Additional Metrics
    if (activeTab === 6) {
      if (!selectedAdditionalCol) {
        return (
          <Box className={styles.emptySelectionState}>
            <Typography variant="body1">No additional columns detected in the dataset</Typography>
          </Box>
        );
      }

      const values = timeseriesData.map((d) => {
        const rawVal = d.rawRowData?.[selectedAdditionalCol];
        return rawVal !== undefined && rawVal !== null ? parseFloat(rawVal) : null;
      });

      if (isDataEmpty(values)) {
        return renderNoDataWarning(selectedAdditionalCol);
      }

      const trace = {
        x: timestamps,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: selectedAdditionalCol,
        line: { color: '#8b5cf6', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(139, 92, 246, 0.04)',
        hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>${selectedAdditionalCol}:</b> %{y:.2f}<extra></extra>`,
      };

      return (
        <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={680} sx={{ borderRadius: '16px' }} />}>
          <LazyPlot
            data={[trace]}
            layout={{
              ...plotlyLayoutDefaults,
              yaxis: {
                ...plotlyLayoutDefaults.yaxis,
                title: { text: selectedAdditionalCol, font: { size: 12 } },
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
            Select Wind Speed Metrics
          </Typography>
          <FormGroup row sx={{ gap: 2 }}>
            {datasetMeta.windSpeedCols.map((col) => (
              <FormControlLabel
                key={col}
                control={
                  <Checkbox
                    checked={Boolean(selectedSpeedCols[col])}
                    onChange={(e) =>
                      setSelectedSpeedCols((prev) => ({
                        ...prev,
                        [col]: e.target.checked,
                      }))
                    }
                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#6ee7f9' } }}
                  />
                }
                label={col}
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
            Select Wind Direction Metrics
          </Typography>
          <FormGroup row sx={{ gap: 2 }}>
            {datasetMeta.windDirectionCols.map((col) => (
              <FormControlLabel
                key={col}
                control={
                  <Checkbox
                    checked={Boolean(selectedDirectionCols[col])}
                    onChange={(e) =>
                      setSelectedDirectionCols((prev) => ({
                        ...prev,
                        [col]: e.target.checked,
                      }))
                    }
                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#38bdf8' } }}
                  />
                }
                label={col}
                sx={{ color: '#eff6ff' }}
              />
            ))}
          </FormGroup>
        </Paper>
      );
    }

    if (activeTab === 2) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Temperature Metric
          </Typography>
          <Box className={styles.metricChipsContainer}>
            {datasetMeta.temperatureCols.map((col) => (
              <Chip
                key={col}
                label={col}
                onClick={() => setSelectedTempCol(col)}
                className={`${styles.metricChip} ${selectedTempCol === col ? styles.metricChipActive : ''}`}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      );
    }

    if (activeTab === 3) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Humidity Metric
          </Typography>
          <Box className={styles.metricChipsContainer}>
            {datasetMeta.humidityCols.map((col) => (
              <Chip
                key={col}
                label={col}
                onClick={() => setSelectedHumidityCol(col)}
                className={`${styles.metricChip} ${selectedHumidityCol === col ? styles.metricChipActive : ''}`}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      );
    }

    if (activeTab === 4) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Pressure Metric
          </Typography>
          <Box className={styles.metricChipsContainer}>
            {datasetMeta.pressureCols.map((col) => (
              <Chip
                key={col}
                label={col}
                onClick={() => setSelectedPressureCol(col)}
                className={`${styles.metricChip} ${selectedPressureCol === col ? styles.metricChipActive : ''}`}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      );
    }

    if (activeTab === 5) {
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
                {datasetMeta.allMetricCols.map((col) => (
                  <MenuItem key={col} value={col} disabled={col === scatterY}>
                    {col}
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
                {datasetMeta.allMetricCols.map((col) => (
                  <MenuItem key={col} value={col} disabled={col === scatterX}>
                    {col}
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

    if (activeTab === 6 && datasetMeta.additionalCols.length > 0) {
      return (
        <Paper className={styles.horizontalControlBar} elevation={0}>
          <Typography variant="subtitle2" className={styles.controlTitle}>
            Select Dataset Column Metric
          </Typography>
          <Box className={styles.metricChipsContainer}>
            {datasetMeta.additionalCols.map((col) => (
              <Chip
                key={col}
                label={col}
                onClick={() => setSelectedAdditionalCol(col)}
                className={`${styles.metricChip} ${selectedAdditionalCol === col ? styles.metricChipActive : ''}`}
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      );
    }

    return null;
  };

  const renderStatsCards = () => {
    if (!timeseriesData || timeseriesData.length === 0 || activeMetrics.length === 0) return null;

    return (
      <Box className={styles.statsCardsContainer}>
        <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap" className={styles.statsGrid}>
          {activeMetrics.map((metric) => {
            const stat = metricsStats[metric] || { min: 'N/A', max: 'N/A' };
            return (
              <Paper key={metric} className={styles.statCard} elevation={0}>
                <Typography className={styles.statCardMetricName}>
                  {metric}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                  <Box>
                    <Typography className={styles.statLabel}>Min</Typography>
                    <Typography className={styles.statValue}>
                      {typeof stat.min === 'number' ? stat.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stat.min}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className={styles.statLabel}>Max</Typography>
                    <Typography className={styles.statValue}>
                      {typeof stat.max === 'number' ? stat.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stat.max}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    );
  };

  return (
    <Paper className={styles.workspace} elevation={0}>
      <Stack spacing={3.2}>
        {/* Workspace Title & Layout Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems="center">
          <Box>
            <Typography variant="h5" className={styles.title}>
              {activeTab === 0 && 'Wind Speed Timeline'}
              {activeTab === 1 && 'Wind Direction Timeline'}
              {activeTab === 2 && 'Ambient Temperature Timeline'}
              {activeTab === 3 && 'Relative Humidity Timeline'}
              {activeTab === 4 && 'Atmospheric Pressure Timeline'}
              {activeTab === 5 && 'Correlation Scatter Workspace'}
              {activeTab === 6 && 'Dynamic Dataset Column Explorer'}
            </Typography>
            <Typography variant="body2" className={styles.subtitle}>
              {activeTab === 0 && 'Track and overlay wind speeds across multiple heights simultaneously.'}
              {activeTab === 1 && 'Scatter timeline of wind direction angles (degrees) representing orientation currents.'}
              {activeTab === 2 && 'Timeline tracing ambient temperature variations in Celsius.'}
              {activeTab === 3 && 'Monitoring relative humidity percentages over the dataset observation window.'}
              {activeTab === 4 && 'Timeline tracking barometric air pressure measurements in millibars (mbar).'}
              {activeTab === 5 && 'Explore correlations between any pair of metrics. Includes customizable linear regression trendline overlay.'}
              {activeTab === 6 && 'Plot and visualize remaining columns in the dataset CSV dynamically.'}
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

        {/* Dynamic statistics cards displaying Min/Max above the chart */}
        {renderStatsCards()}

        {/* 100% Full-Width Chart Container (Requirement 6 & 8) */}
        <Box className={styles.chartWrapper}>
          {renderChart()}
        </Box>
      </Stack>
    </Paper>
  );
}
