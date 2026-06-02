import { useState } from 'react';
import { Paper, Tabs, Tab, Stack } from '@mui/material';
import styles from './GraphTabs.module.css';

export default function GraphTabsBar({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper className={styles.tabsCard} elevation={0}>
      <Stack spacing={1.2}>
        <Tabs
          value={activeTab}
          onChange={(_, nextValue) => setActiveTab(nextValue)}
          variant="scrollable"
          scrollButtons="auto"
          className={styles.tabsRoot}
        >
          {tabs.map((tab) => (
            <Tab key={tab.label} icon={<tab.icon />} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      </Stack>
    </Paper>
  );
}
