import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function PlotlyWrapper({ data, layout, config, useResizeHandler = true, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Render the chart using standard plotly.js-dist-min methods
    Plotly.newPlot(containerRef.current, data, layout, config);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    if (useResizeHandler) {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (useResizeHandler) {
        window.removeEventListener('resize', handleResize);
      }
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, layout, config, useResizeHandler]);

  return <div ref={containerRef} style={style} className="plotly-container" />;
}
