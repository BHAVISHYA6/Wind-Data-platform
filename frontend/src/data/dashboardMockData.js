import {
  FiActivity,
  FiAlertTriangle,
  FiDroplet,
  FiWind,
  FiThermometer,
  FiCheckCircle,
  FiBarChart2,
} from 'react-icons/fi';

export const datasetStatus = {
  label: 'Dataset ready',
  value: '17,240 rows',
  tone: 'success',
};

export const summaryCards = [
  {
    title: 'Total Records',
    value: '17,240',
    delta: '+4.8%',
    icon: FiActivity,
    accent: '#60a5fa',
  },
  {
    title: 'Valid Records',
    value: '16,812',
    delta: '97.5%',
    icon: FiCheckCircle,
    accent: '#34d399',
  },
  {
    title: 'Invalid Records',
    value: '428',
    delta: '2.5%',
    icon: FiAlertTriangle,
    accent: '#fb7185',
  },
  {
    title: 'Average Wind Speed',
    value: '6.8 m/s',
    delta: 'stable',
    icon: FiWind,
    accent: '#38bdf8',
  },
  {
    title: 'Average Temperature',
    value: '24.2 °C',
    delta: '+0.4 °C',
    icon: FiThermometer,
    accent: '#f59e0b',
  },
  {
    title: 'Average Humidity',
    value: '61.4%',
    delta: '-1.2%',
    icon: FiDroplet,
    accent: '#22d3ee',
  },
];

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
