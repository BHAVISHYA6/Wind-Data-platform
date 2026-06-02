import { createTheme, alpha } from '@mui/material/styles';

export const dashboardTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6ee7f9',
    },
    secondary: {
      main: '#8b5cf6',
    },
    background: {
      default: '#07111f',
      paper: alpha('#0f1b2d', 0.78),
    },
    text: {
      primary: '#eff6ff',
      secondary: 'rgba(226, 232, 240, 0.72)',
    },
    success: {
      main: '#34d399',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#fb7185',
    },
    info: {
      main: '#38bdf8',
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 14,
          fontWeight: 700,
          paddingInline: 18,
          paddingBlock: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 0,
          minWidth: 0,
          borderRadius: 999,
          paddingInline: 18,
          paddingBlock: 10,
          fontWeight: 700,
        },
      },
    },
  },
});
