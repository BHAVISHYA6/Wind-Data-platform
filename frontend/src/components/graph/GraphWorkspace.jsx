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
} from '@mui/material';
import {
  FiTrendingUp,
  FiDatabase,
  FiAlertCircle,
  FiPlay,
  FiSliders,
  FiWind,
  FiCompass,
  FiThermometer,
  FiDroplet,
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiGrid,
} from 'react-icons/fi';
import styles from './GraphWorkspace.module.css';
import { graphTabs } from '../../data/dashboardMockData';

// Lazy load the Plotly component wrapper
const LazyPlot = lazy(() => import('../chart/PlotlyWrapper'));

// --- Math & Analytics Helpers ---

// Lanczos approximation for Gamma function
const gamma = (x) => {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  const g = 7;
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let a = p[0];
  let t = x + g + 0.5;
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
};

// 16-sector Wind Direction helper
const getDirectionSector = (deg) => {
  if (deg === null || deg === undefined || isNaN(deg)) return 'N/A';
  deg = (deg % 360 + 360) % 360; // normalize
  const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return sectors[index];
};

// Extract height from column name helper
const parseHeight = (colName) => {
  const match = colName.match(/(\d+)\s*m/i) || colName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export default function GraphWorkspace({ activeTab, timeseriesData, isLoading, hasError, summaryData }) {
  // Resolve current tab label to avoid hardcoded index dependencies
  const currentTabLabel = useMemo(() => {
    return graphTabs[activeTab]?.label || 'KPI Dashboard';
  }, [activeTab]);

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
      // Skip date/time/timestamp columns
      if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey === 'timestamp') {
        return;
      }

      // Check standard deviation / dispersion metrics first to separate them into explorer/additionalCols
      if (lowerKey.includes('std') || lowerKey.includes('dispersion') || lowerKey.includes('dev')) {
        additionalCols.push(key);
      } else if (
        lowerKey.includes('temp') ||
        lowerKey.includes('temperature') ||
        key.includes('[°C]') ||
        lowerKey.includes('[c]') ||
        lowerKey.includes('celsius') ||
        lowerKey.includes('degc')
      ) {
        temperatureCols.push(key);
      } else if (
        lowerKey.includes('direction') ||
        lowerKey.includes('dir') ||
        lowerKey.includes('wd') ||
        lowerKey.includes('wv') ||
        key.includes('[°]') ||
        lowerKey.includes('[]') ||
        lowerKey.includes('\uFFFD') ||
        lowerKey.includes('[]') ||
        lowerKey.includes('deg')
      ) {
        windDirectionCols.push(key);
      } else if (
        lowerKey.includes('hum') ||
        lowerKey.includes('humidity') ||
        key.includes('[%]') ||
        lowerKey.includes('rh')
      ) {
        humidityCols.push(key);
      } else if (
        lowerKey.includes('pres') ||
        lowerKey.includes('pressure') ||
        key.includes('[mbar]') ||
        lowerKey.includes('bar') ||
        lowerKey.includes('hpa') ||
        lowerKey.includes('atm')
      ) {
        pressureCols.push(key);
      } else if (
        lowerKey.includes('speed') ||
        lowerKey.includes('ws') ||
        lowerKey.includes('avg') ||
        key.includes('[m/s]')
      ) {
        windSpeedCols.push(key);
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

    // Logging to satisfy trace & mapping requirements
    console.log('=== Trace Data Flow Debug ===');
    console.log('API Response data count:', timeseriesData.length);
    if (timeseriesData.length > 0) {
      console.log('First Record Fields:', Object.keys(firstRow));
      console.log('First Record rawRowData Keys:', rawKeys);
    }
    console.log('Metric Mapping results:');
    console.log('  • windSpeedCols:', windSpeedCols);
    console.log('  • windDirectionCols:', windDirectionCols);
    console.log('  • temperatureCols:', temperatureCols);
    console.log('  • humidityCols:', humidityCols);
    console.log('  • pressureCols:', pressureCols);
    console.log('  • additionalCols:', additionalCols);
    console.log('=============================');

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

  // --- Dynamic Advanced Wind Resource Analytics ---
  const windAnalytics = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) {
      return {
        avgSpeed: 0,
        maxSpeed: 0,
        minSpeed: 0,
        overallTI: 0,
        tiByHeight: [],
        shearCoefficient: 0,
        shearTimeseries: [],
        shearProfile: null,
        weibull: { k: 0, c: 0, histogram: [], pdf: [], colName: 'N/A' },
        dominantDirection: 'N/A',
        dataAvailability: 100,
        validRecords: 0,
        invalidRecords: 0,
      };
    }

    // --- Data counts & availability ---
    const validRecords = summaryData?.totalRecords || timeseriesData.length;
    const invalidRecords = summaryData?.totalErrorLogs || 0;
    const totalRecords = validRecords + invalidRecords;
    const dataAvailability = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100;

    // --- Basic Speed KPIs ---
    let speedSum = 0;
    let speedCount = 0;
    let maxSpeed = -Infinity;
    let minSpeed = Infinity;
    const allSpeeds = [];

    timeseriesData.forEach((row) => {
      datasetMeta.windSpeedCols.forEach((col) => {
        const val = row.rawRowData?.[col];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            speedSum += num;
            speedCount++;
            if (num > maxSpeed) maxSpeed = num;
            if (num < minSpeed) minSpeed = num;
            allSpeeds.push(num);
          }
        }
      });
    });

    const avgSpeed = speedCount > 0 ? speedSum / speedCount : 0;
    maxSpeed = maxSpeed === -Infinity ? 0 : maxSpeed;
    minSpeed = minSpeed === Infinity ? 0 : minSpeed;

    // --- Turbulence Intensity (TI) ---
    const speedColsWithHeights = datasetMeta.windSpeedCols.map(col => ({
      col,
      height: parseHeight(col)
    })).filter(x => x.height !== null);

    const tiByHeight = [];
    let tiSumTotal = 0;
    let tiCountTotal = 0;

    speedColsWithHeights.forEach(({ col: avgCol, height }) => {
      const stdCol = datasetMeta.additionalCols.find(col => {
        const colH = parseHeight(col);
        const hasStdKeywords = col.toLowerCase().includes('std') || col.toLowerCase().includes('dispersion');
        return colH === height && hasStdKeywords;
      });

      if (stdCol) {
        let sumTi = 0;
        let countTi = 0;
        const tiSeries = timeseriesData.map((row) => {
          const avgVal = parseFloat(row.rawRowData?.[avgCol]);
          const stdVal = parseFloat(row.rawRowData?.[stdCol]);
          if (avgVal > 0 && !isNaN(stdVal)) {
            const ti = stdVal / avgVal;
            sumTi += ti;
            countTi++;
            return ti;
          }
          return null;
        });

        if (countTi > 0) {
          const avgTIForHeight = sumTi / countTi;
          tiByHeight.push({
            height,
            avgCol,
            stdCol,
            avgTI: avgTIForHeight,
            timeseries: tiSeries
          });
          tiSumTotal += avgTIForHeight;
          tiCountTotal++;
        }
      }
    });

    let overallTI = 0;
    if (tiCountTotal > 0) {
      overallTI = tiSumTotal / tiCountTotal;
    } else if (allSpeeds.length > 1 && avgSpeed > 0) {
      // Fallback: Overall timeseries SD / Mean
      let varSum = 0;
      allSpeeds.forEach(v => { varSum += (v - avgSpeed) ** 2; });
      const overallStd = Math.sqrt(varSum / (allSpeeds.length - 1));
      overallTI = overallStd / avgSpeed;
    }

    // --- Wind Shear Exponent (alpha) ---
    const uniqueHeights = [...new Set(speedColsWithHeights.map(x => x.height))].sort((a, b) => a - b);
    let shearCoefficient = 0;
    const shearTimeseries = [];
    let shearProfile = null;

    if (uniqueHeights.length >= 2) {
      const h1 = uniqueHeights[0];
      const h2 = uniqueHeights[uniqueHeights.length - 1];
      const col1 = speedColsWithHeights.find(x => x.height === h1).col;
      const col2 = speedColsWithHeights.find(x => x.height === h2).col;

      let alphaSum = 0;
      let alphaCount = 0;

      timeseriesData.forEach((row) => {
        const v1 = parseFloat(row.rawRowData?.[col1]);
        const v2 = parseFloat(row.rawRowData?.[col2]);
        if (v1 > 0 && v2 > 0 && h2 > h1) {
          const alpha = Math.log(v2 / v1) / Math.log(h2 / h1);
          alphaSum += alpha;
          alphaCount++;
          shearTimeseries.push(alpha);
        } else {
          shearTimeseries.push(null);
        }
      });

      shearCoefficient = alphaCount > 0 ? alphaSum / alphaCount : 0;

      const observedProfile = uniqueHeights.map(h => {
        const heightCols = speedColsWithHeights.filter(x => x.height === h);
        let sumH = 0;
        let countH = 0;
        timeseriesData.forEach(row => {
          heightCols.forEach(hc => {
            const v = parseFloat(row.rawRowData?.[hc.col]);
            if (!isNaN(v)) {
              sumH += v;
              countH++;
            }
          });
        });
        return {
          height: h,
          avgSpeed: countH > 0 ? sumH / countH : 0
        };
      });

      const v_ref = observedProfile[0].avgSpeed;
      const h_ref = observedProfile[0].height;
      const fittedProfile = [];
      const maxH = Math.max(...uniqueHeights) + 10;
      for (let h = 0; h <= maxH; h += 5) {
        let v = 0;
        if (h_ref > 0 && v_ref > 0) {
          v = v_ref * Math.pow(h / h_ref, shearCoefficient);
        }
        fittedProfile.push({ height: h, speed: v });
      }

      shearProfile = {
        observed: observedProfile,
        fitted: fittedProfile,
        hRef: h_ref,
        vRef: v_ref
      };
    }

    // --- Weibull Distribution Fitting ---
    const activeSpeedKeys = Object.keys(selectedSpeedCols).filter(col => selectedSpeedCols[col]);
    const weibullCol = activeSpeedKeys[0] || datasetMeta.windSpeedCols[0];
    let weibull = { k: 0, c: 0, histogram: [], pdf: [], colName: weibullCol || 'N/A' };

    if (weibullCol) {
      const colValues = [];
      let colSum = 0;
      timeseriesData.forEach((row) => {
        const val = row.rawRowData?.[weibullCol];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            colValues.push(num);
            colSum += num;
          }
        }
      });

      if (colValues.length > 1) {
        const mu = colSum / colValues.length;
        let varSum = 0;
        colValues.forEach(v => { varSum += (v - mu) ** 2; });
        const sigma = Math.sqrt(varSum / (colValues.length - 1));

        const k = Math.pow(sigma / mu, -1.086);
        const c = mu / gamma(1 + 1 / k);

        const maxVal = Math.max(...colValues);
        const binWidth = 1.0;
        const maxBin = Math.min(25, Math.ceil(maxVal));
        const binCounts = new Array(maxBin).fill(0);

        colValues.forEach((v) => {
          const binIdx = Math.floor(v / binWidth);
          if (binIdx >= 0 && binIdx < maxBin) {
            binCounts[binIdx]++;
          }
        });

        const histogram = binCounts.map((count, idx) => ({
          binStart: idx * binWidth,
          binEnd: (idx + 1) * binWidth,
          density: count / (colValues.length * binWidth),
        }));

        const pdf = [];
        const step = 0.25;
        for (let v = 0; v <= maxBin; v += step) {
          let f = 0;
          if (v > 0 && c > 0 && k > 0) {
            f = (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k));
          }
          pdf.push({ v, f });
        }

        weibull = { k, c, histogram, pdf, colName: weibullCol };
      }
    }

    // --- Dominant Wind Direction ---
    const sectorsCount = {};
    let totalDirections = 0;
    timeseriesData.forEach((row) => {
      datasetMeta.windDirectionCols.forEach((col) => {
        const val = row.rawRowData?.[col];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            const sector = getDirectionSector(num);
            sectorsCount[sector] = (sectorsCount[sector] || 0) + 1;
            totalDirections++;
          }
        }
      });
    });

    let dominantDirection = 'N/A';
    let maxDirCount = 0;
    Object.entries(sectorsCount).forEach(([sector, count]) => {
      if (count > maxDirCount) {
        maxDirCount = count;
        dominantDirection = sector;
      }
    });
    if (totalDirections > 0 && dominantDirection !== 'N/A') {
      const percentage = ((maxDirCount / totalDirections) * 100).toFixed(1);
      dominantDirection = `${dominantDirection} (${percentage}%)`;
    }

    return {
      avgSpeed,
      maxSpeed,
      minSpeed,
      overallTI,
      tiByHeight,
      shearCoefficient,
      shearTimeseries,
      shearProfile,
      weibull,
      dominantDirection,
      dataAvailability,
      validRecords,
      invalidRecords,
    };
  }, [timeseriesData, datasetMeta, summaryData, selectedSpeedCols]);

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
    if (currentTabLabel === 'Wind Speed') {
      selectedText = `Speeds: ${Object.keys(selectedSpeedCols).filter(k => selectedSpeedCols[k]).join(', ')}`;
    } else if (currentTabLabel === 'Wind Direction') {
      selectedText = `Directions: ${Object.keys(selectedDirectionCols).filter(k => selectedDirectionCols[k]).join(', ')}`;
    } else if (currentTabLabel === 'Temperature') {
      selectedText = `Temperature: ${selectedTempCol}`;
    } else if (currentTabLabel === 'Humidity') {
      selectedText = `Humidity: ${selectedHumidityCol}`;
    } else if (currentTabLabel === 'Pressure') {
      selectedText = `Pressure: ${selectedPressureCol}`;
    } else if (currentTabLabel === 'Scatter Analysis') {
      selectedText = generatedScatterConfig
        ? `Scatter [X: ${generatedScatterConfig.xKey}, Y: ${generatedScatterConfig.yKey}]`
        : 'Scatter config pending';
    } else if (currentTabLabel === 'Additional Metrics') {
      selectedText = `Additional: ${selectedAdditionalCol}`;
    }

    console.log('--- Visualization State Selection ---');
    console.log(`Active Tab: ${activeTab} (${currentTabLabel})`);
    console.log(`Discovered speed columns: ${datasetMeta.windSpeedCols.join(', ')}`);
    console.log(`Discovered direction columns: ${datasetMeta.windDirectionCols.join(', ')}`);
    console.log(`Selected Metric: ${selectedText}`);
  }, [activeTab, currentTabLabel, selectedSpeedCols, selectedDirectionCols, selectedTempCol, selectedHumidityCol, selectedPressureCol, selectedAdditionalCol, generatedScatterConfig, datasetMeta]);

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
    if (currentTabLabel === 'Wind Speed') {
      return Object.keys(selectedSpeedCols).filter(col => selectedSpeedCols[col]);
    }
    if (currentTabLabel === 'Wind Direction') {
      return Object.keys(selectedDirectionCols).filter(col => selectedDirectionCols[col]);
    }
    if (currentTabLabel === 'Temperature') {
      return selectedTempCol ? [selectedTempCol] : [];
    }
    if (currentTabLabel === 'Humidity') {
      return selectedHumidityCol ? [selectedHumidityCol] : [];
    }
    if (currentTabLabel === 'Pressure') {
      return selectedPressureCol ? [selectedPressureCol] : [];
    }
    if (currentTabLabel === 'Additional Metrics') {
      return selectedAdditionalCol ? [selectedAdditionalCol] : [];
    }
    return [];
  }, [currentTabLabel, selectedSpeedCols, selectedDirectionCols, selectedTempCol, selectedHumidityCol, selectedPressureCol, selectedAdditionalCol]);

  const metricsStats = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0 || activeMetrics.length === 0) {
      return {};
    }

    const stats = {};
    activeMetrics.forEach((metric) => {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let count = 0;
      let hasValue = false;

      timeseriesData.forEach((row) => {
        const val = row.rawRowData?.[metric];
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (Number.isFinite(num)) {
            if (num < min) min = num;
            if (num > max) max = num;
            sum += num;
            count++;
            hasValue = true;
          }
        }
      });

      stats[metric] = {
        min: hasValue ? parseFloat(min.toFixed(2)) : 'N/A',
        max: hasValue ? parseFloat(max.toFixed(2)) : 'N/A',
        avg: hasValue && count > 0 ? parseFloat((sum / count).toFixed(2)) : 'N/A',
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
    modeBarButtonsToRemove: [], // Keep zoom/pan controls
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

  // --- Rendering UI KPI Cards ---
  const renderKpiCard = (title, value, description, Icon, color) => (
    <Paper
      className={styles.statsCard}
      sx={{
        borderLeft: `4px solid ${color || '#38bdf8'}`,
        flex: 1,
        p: 2.2,
        bgcolor: 'rgba(15, 27, 45, 0.45)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' }
      }}
      elevation={0}
    >
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, fontSize: '0.75rem' }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ color: '#eff6ff', fontWeight: 800, mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.5, fontSize: '0.8rem' }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.05)', color: color || '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} />
      </Box>
    </Paper>
  );

  const renderMiniKpiCard = (title, value, description, color) => (
    <Paper
      className={styles.statsCard}
      sx={{
        borderLeft: `3px solid ${color || '#38bdf8'}`,
        flex: 1,
        minWidth: '160px',
        p: 1.5,
        bgcolor: 'rgba(15, 27, 45, 0.35)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '12px'
      }}
      elevation={0}
    >
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, fontSize: '0.65rem' }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ color: '#eff6ff', fontWeight: 800, mt: 0.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.7rem' }}>
        {description}
      </Typography>
    </Paper>
  );

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

    // KPI Dashboard View
    if (currentTabLabel === 'KPI Dashboard') {
      return (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            {renderKpiCard('Average Wind Speed', `${windAnalytics.avgSpeed.toFixed(2)} m/s`, 'Mean speed across all height levels', FiWind, '#38bdf8')}
            {renderKpiCard('Maximum Wind Speed', `${windAnalytics.maxSpeed.toFixed(2)} m/s`, 'Highest recorded wind speed observation', FiTrendingUp, '#fb7185')}
            {renderKpiCard('Minimum Wind Speed', `${windAnalytics.minSpeed.toFixed(2)} m/s`, 'Lowest recorded wind speed observation', FiSliders, '#f59e0b')}
            
            {renderKpiCard('Dominant Direction', windAnalytics.dominantDirection, 'Most frequent wind vector compass sector', FiCompass, '#34d399')}
            {renderKpiCard('Turbulence Intensity', `${(windAnalytics.overallTI * 100).toFixed(1)}%`, 'Average wind speed standard deviation ratio', FiActivity, '#22d3ee')}
            {renderKpiCard('Wind Shear Exponent (α)', windAnalytics.shearCoefficient.toFixed(3), 'Vertical wind velocity profile gradient', FiTrendingUp, '#8b5cf6')}
            
            {renderKpiCard('Data Availability', `${windAnalytics.dataAvailability.toFixed(1)}%`, 'Percentage of successfully validated records', FiCheckCircle, '#10b981')}
            {renderKpiCard('Valid Records', windAnalytics.validRecords.toLocaleString(), 'Total database wind speed observations', FiDatabase, '#60a5fa')}
            {renderKpiCard('Invalid Records', windAnalytics.invalidRecords.toLocaleString(), 'Failing rows written to ErrorLog schema', FiAlertTriangle, '#f43f5e')}
          </Box>
        </Box>
      );
    }

    // Wind Speed Timeline & Advanced Charts
    if (currentTabLabel === 'Wind Speed') {
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
        <Stack spacing={4} sx={{ width: '100%' }}>
          <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(15, 27, 45, 0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" sx={{ color: '#eff6ff', fontWeight: 600, mb: 1 }}>
              Wind Speed Overlay Timeline
            </Typography>
            <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={450} sx={{ borderRadius: '16px' }} />}>
              <LazyPlot
                data={traces}
                layout={{
                  ...plotlyLayoutDefaults,
                  height: 450,
                  yaxis: {
                    ...plotlyLayoutDefaults.yaxis,
                    title: { text: 'Wind Speed (m/s)', font: { size: 12 } },
                  },
                }}
                config={config}
                useResizeHandler
                style={{ width: '100%', height: '450px' }}
              />
            </Suspense>
          </Box>

          <Typography variant="h6" sx={{ color: '#eff6ff', fontWeight: 700, mt: 3, mb: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1 }}>
            Advanced Wind Resource Analytics
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3.2 }}>
            {/* Weibull Distribution Fitting */}
            {windAnalytics.weibull.k > 0 && (
              <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(15, 27, 45, 0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="subtitle1" sx={{ color: '#eff6ff', fontWeight: 600, mb: 1.5 }}>
                  Weibull Frequency Fit ({windAnalytics.weibull.colName})
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {renderMiniKpiCard('Weibull Shape (k)', windAnalytics.weibull.k.toFixed(2), 'Wind speed variability factor', '#fb7185')}
                  {renderMiniKpiCard('Weibull Scale (c)', `${windAnalytics.weibull.c.toFixed(2)} m/s`, 'Theoretical average speed factor', '#6ee7f9')}
                </Stack>
                <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={320} sx={{ borderRadius: '12px' }} />}>
                  <LazyPlot
                    data={[
                      {
                        x: windAnalytics.weibull.histogram.map(b => b.binStart + 0.5),
                        y: windAnalytics.weibull.histogram.map(b => b.density),
                        type: 'bar',
                        name: 'Observed Density',
                        marker: { color: 'rgba(56, 189, 248, 0.35)', line: { color: '#38bdf8', width: 1 } },
                        hovertemplate: 'Speed Bin: %{x} m/s<br>Frequency: %{y:.3f}<extra></extra>'
                      },
                      {
                        x: windAnalytics.weibull.pdf.map(p => p.v),
                        y: windAnalytics.weibull.pdf.map(p => p.f),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Fitted Weibull PDF',
                        line: { color: '#fb7185', width: 2.5 },
                        hovertemplate: 'Speed: %{x} m/s<br>PDF Density: %{y:.3f}<extra></extra>'
                      }
                    ]}
                    layout={{
                      ...plotlyLayoutDefaults,
                      height: 320,
                      margin: { t: 15, r: 15, b: 40, l: 50 },
                      xaxis: { ...plotlyLayoutDefaults.xaxis, title: 'Wind Speed (m/s)' },
                      yaxis: { ...plotlyLayoutDefaults.yaxis, title: 'Probability Density' },
                    }}
                    config={config}
                    useResizeHandler
                    style={{ width: '100%', height: '320px' }}
                  />
                </Suspense>
              </Box>
            )}

            {/* Wind Shear Profile Fit */}
            {windAnalytics.shearProfile && (
              <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(15, 27, 45, 0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="subtitle1" sx={{ color: '#eff6ff', fontWeight: 600, mb: 1.5 }}>
                  Wind Velocity Shear Exponent
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {renderMiniKpiCard('Shear Exponent (α)', windAnalytics.shearCoefficient.toFixed(3), `gradient exponent profile`, '#8b5cf6')}
                </Stack>
                <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={320} sx={{ borderRadius: '12px' }} />}>
                  <LazyPlot
                    data={[
                      {
                        x: windAnalytics.shearProfile.observed.map(o => o.avgSpeed),
                        y: windAnalytics.shearProfile.observed.map(o => o.height),
                        type: 'scatter',
                        mode: 'markers+lines',
                        name: 'Measured mean',
                        marker: { color: '#34d399', size: 10, symbol: 'square' },
                        line: { color: '#34d399', width: 1.5, dash: 'dot' },
                        hovertemplate: 'Observed: %{x:.2f} m/s at %{y}m<extra></extra>'
                      },
                      {
                        x: windAnalytics.shearProfile.fitted.map(f => f.speed),
                        y: windAnalytics.shearProfile.fitted.map(f => f.height),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Power Law Fit',
                        line: { color: '#8b5cf6', width: 2.5 },
                        hovertemplate: 'Fitted: %{x:.2f} m/s at %{y}m<extra></extra>'
                      }
                    ]}
                    layout={{
                      ...plotlyLayoutDefaults,
                      height: 320,
                      margin: { t: 15, r: 15, b: 40, l: 50 },
                      xaxis: { ...plotlyLayoutDefaults.xaxis, title: 'Wind Speed (m/s)' },
                      yaxis: { ...plotlyLayoutDefaults.yaxis, title: 'Height Above Ground (m)' },
                    }}
                    config={config}
                    useResizeHandler
                    style={{ width: '100%', height: '320px' }}
                  />
                </Suspense>
              </Box>
            )}
          </Box>

          {/* Turbulence Intensity Section */}
          {windAnalytics.tiByHeight.length > 0 && (
            <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(15, 27, 45, 0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="subtitle1" sx={{ color: '#eff6ff', fontWeight: 600, mb: 1.5 }}>
                Turbulence Intensity (TI) Timeseries by Height
              </Typography>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                {windAnalytics.tiByHeight.map(tiData => (
                  renderMiniKpiCard(`Avg TI (${tiData.height}m)`, `${(tiData.avgTI * 100).toFixed(1)}%`, `Avg standard deviation ratio`, '#22d3ee')
                ))}
              </Stack>
              <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={320} sx={{ borderRadius: '12px' }} />}>
                <LazyPlot
                  data={windAnalytics.tiByHeight.map((tiData, idx) => ({
                    x: timestamps,
                    y: tiData.timeseries,
                    type: 'scatter',
                    mode: 'lines',
                    name: `TI at ${tiData.height}m`,
                    line: { color: CHART_COLORS[idx % CHART_COLORS.length], width: 1.5 },
                    hovertemplate: `%{x|%d-%m-%Y %H:%M}<br><b>TI ${tiData.height}m:</b> %{y:.1%}<extra></extra>`,
                  }))}
                  layout={{
                    ...plotlyLayoutDefaults,
                    height: 320,
                    margin: { t: 15, r: 15, b: 40, l: 50 },
                    xaxis: { ...plotlyLayoutDefaults.xaxis },
                    yaxis: { ...plotlyLayoutDefaults.yaxis, title: 'Turbulence Intensity (σ / μ)', tickformat: ',.0%' },
                  }}
                  config={config}
                  useResizeHandler
                  style={{ width: '100%', height: '320px' }}
                />
              </Suspense>
            </Box>
          )}
        </Stack>
      );
    }

    // Wind Direction
    if (currentTabLabel === 'Wind Direction') {
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

    // Temperature
    if (currentTabLabel === 'Temperature') {
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

    // Humidity
    if (currentTabLabel === 'Humidity') {
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

    // Pressure
    if (currentTabLabel === 'Pressure') {
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

    // Scatter Analysis
    if (currentTabLabel === 'Scatter Analysis') {
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
              modeBarButtonsToRemove: [],
            }}
            useResizeHandler
            style={{ width: '100%', height: '680px' }}
          />
        </Suspense>
      );
    }

    // Additional Metrics Explorer
    if (currentTabLabel === 'Additional Metrics') {
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

    if (currentTabLabel === 'Wind Speed') {
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

    if (currentTabLabel === 'Wind Direction') {
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

    if (currentTabLabel === 'Temperature') {
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

    if (currentTabLabel === 'Humidity') {
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

    if (currentTabLabel === 'Pressure') {
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

    if (currentTabLabel === 'Scatter Analysis') {
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

    if (currentTabLabel === 'Additional Metrics' && datasetMeta.additionalCols.length > 0) {
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
    if (currentTabLabel === 'KPI Dashboard' || currentTabLabel === 'Scatter Analysis') return null;

    return (
      <Box sx={{ mb: 1 }}>
        <Stack direction="row" spacing={2.4} useFlexGap flexWrap="wrap" sx={{ width: '100%' }}>
          {activeMetrics.map((metric) => {
            const stat = metricsStats[metric] || { min: 'N/A', avg: 'N/A', max: 'N/A' };
            return (
              <Paper key={metric} className={styles.statsCard} sx={{ flex: 1, minWidth: '220px', p: 2, bgcolor: 'rgba(15, 27, 45, 0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }} elevation={0}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
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
                    <Typography className={styles.statLabel}>Avg</Typography>
                    <Typography className={styles.statValue}>
                      {typeof stat.avg === 'number' ? stat.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stat.avg}
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
              {currentTabLabel === 'KPI Dashboard' && 'Key Performance Indicators'}
              {currentTabLabel === 'Wind Speed' && 'Wind Speed Timeline'}
              {currentTabLabel === 'Wind Direction' && 'Wind Direction Timeline'}
              {currentTabLabel === 'Temperature' && 'Ambient Temperature Timeline'}
              {currentTabLabel === 'Humidity' && 'Relative Humidity Timeline'}
              {currentTabLabel === 'Pressure' && 'Atmospheric Pressure Timeline'}
              {currentTabLabel === 'Scatter Analysis' && 'Correlation Scatter Workspace'}
              {currentTabLabel === 'Additional Metrics' && 'Dynamic Dataset Column Explorer'}
            </Typography>
            <Typography variant="body2" className={styles.subtitle}>
              {currentTabLabel === 'KPI Dashboard' && 'Overview of wind energy performance metrics, availability and records summary.'}
              {currentTabLabel === 'Wind Speed' && 'Track wind speeds, turbulence intensity, wind shear, and Weibull parameters.'}
              {currentTabLabel === 'Wind Direction' && 'Scatter timeline of wind direction angles representing orientation currents.'}
              {currentTabLabel === 'Temperature' && 'Ambient temperature variations in Celsius across the observation window.'}
              {currentTabLabel === 'Humidity' && 'Traces relative humidity percentages over the dataset window.'}
              {currentTabLabel === 'Pressure' && 'Traces barometric air pressure measurements in millibars (mbar).'}
              {currentTabLabel === 'Scatter Analysis' && 'Explore correlations between any pair of metrics with linear trendlines.'}
              {currentTabLabel === 'Additional Metrics' && 'Plot remaining timeseries variables or display calculated metadata cards.'}
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

        {/* Tab-Specific Control Panels */}
        {renderControlPanel()}

        {/* Dynamic statistics cards displaying Min/Avg/Max above the chart */}
        {renderStatsCards()}

        {/* 100% Full-Width Chart Container */}
        <Box className={styles.chartWrapper}>
          {renderChart()}
        </Box>
      </Stack>
    </Paper>
  );
}
