import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiDroplet,
  FiWind,
  FiThermometer,
  FiBarChart2,
} from 'react-icons/fi';

export const datasetStatus = {
  label: 'Dataset ready',
  value: '17,240 rows',
  tone: 'success',
};

export const defaultSummaryCards = [
  {
    title: 'Total Records',
    value: '--',
    delta: 'loading from API',
    icon: FiActivity,
    accent: '#60a5fa',
  },
  {
    title: 'Valid Records',
    value: '--',
    delta: 'loading from API',
    icon: FiCheckCircle,
    accent: '#34d399',
  },
  {
    title: 'Invalid Records',
    value: '--',
    delta: 'loading from API',
    icon: FiAlertTriangle,
    accent: '#fb7185',
  },
  {
    title: 'Average Wind Speed',
    value: 'N/A',
    delta: 'not available yet',
    icon: FiWind,
    accent: '#38bdf8',
  },
  {
    title: 'Average Temperature',
    value: '--',
    delta: 'loading from API',
    icon: FiThermometer,
    accent: '#f59e0b',
  },
  {
    title: 'Average Humidity',
    value: '--',
    delta: 'loading from API',
    icon: FiDroplet,
    accent: '#22d3ee',
  },
];

export const buildSummaryCards = (summaryData) => {
  if (!summaryData) {
    return defaultSummaryCards;
  }

  const totalRecords = Number(summaryData.totalRecords ?? 0);
  const totalErrorLogs = Number(summaryData.totalErrorLogs ?? 0);
  const validRecords = Math.max(totalRecords - totalErrorLogs, 0);
  const avgHumidity =
    summaryData.avgHumidity === null || summaryData.avgHumidity === undefined
      ? 'N/A'
      : `${Number(summaryData.avgHumidity).toFixed(2)}%`;
  const avgTemperature =
    summaryData.avgTemperature === null || summaryData.avgTemperature === undefined
      ? 'N/A'
      : `${Number(summaryData.avgTemperature).toFixed(2)} °C`;

  return [
    {
      title: 'Total Records',
      value: totalRecords.toLocaleString(),
      delta: 'from API',
      icon: FiActivity,
      accent: '#60a5fa',
    },
    {
      title: 'Valid Records',
      value: validRecords.toLocaleString(),
      delta: totalRecords > 0 ? `${((validRecords / totalRecords) * 100).toFixed(1)}% valid` : '0% valid',
      icon: FiCheckCircle,
      accent: '#34d399',
    },
    {
      title: 'Invalid Records',
      value: totalErrorLogs.toLocaleString(),
      delta: totalRecords > 0 ? `${((totalErrorLogs / totalRecords) * 100).toFixed(1)}% invalid` : '0% invalid',
      icon: FiAlertTriangle,
      accent: '#fb7185',
    },
    {
      title: 'Average Wind Speed',
      value: 'N/A',
      delta: 'not available yet',
      icon: FiWind,
      accent: '#38bdf8',
    },
    {
      title: 'Average Temperature',
      value: avgTemperature,
      delta: 'from API',
      icon: FiThermometer,
      accent: '#f59e0b',
    },
    {
      title: 'Average Humidity',
      value: avgHumidity,
      delta: 'from API',
      icon: FiDroplet,
      accent: '#22d3ee',
    },
  ];
};

export const graphTabs = [
  { label: 'Wind Speed', icon: FiWind },
  { label: 'Wind Direction', icon: FiActivity },
  { label: 'Temperature', icon: FiThermometer },
  { label: 'Humidity', icon: FiDroplet },
  { label: 'Additional Metrics', icon: FiBarChart2 },
];

export const errorLogRows = [
  {
    rowNumber: 12,
    validationErrors: 'Missing temperature, invalid humidity range',
    rawRowData: 'Jan 11, 2017 00:12 | ...',
  },
  {
    rowNumber: 29,
    validationErrors: 'Malformed timestamp format',
    rawRowData: 'Jan 11, 2017 00:29 | ...',
  },
  {
    rowNumber: 41,
    validationErrors: 'Wind direction out of bounds',
    rawRowData: 'Jan 11, 2017 00:41 | ...',
  },
  {
    rowNumber: 58,
    validationErrors: 'Temperature value not numeric',
    rawRowData: 'Jan 11, 2017 00:58 | ...',
  },
  {
    rowNumber: 73,
    validationErrors: 'Humidity field missing',
    rawRowData: 'Jan 11, 2017 01:13 | ...',
  },
];
