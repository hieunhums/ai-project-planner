import React, { useState, useMemo } from 'react';
import GanttChart from '../components/GanttChart';
import { YardSummaryDashboard } from '../components/YardSummaryDashboard';
import { useAllPlanData } from '../hooks/useAllPlanData';
import './YardOverviewPage.css';

export const YardOverviewPage: React.FC = () => {
  const { data: allPlanData, isLoading } = useAllPlanData();

  const [selectedYard, setSelectedYard] = useState<string | null>(null);
  const [drillLabel, setDrillLabel] = useState('');
  const [drillDateRange, setDrillDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const handleDrillDown = (target: { yardPrefix: string; quarterStart: Date; quarterEnd: Date; label: string }) => {
    setSelectedYard(target.yardPrefix);
    setDrillLabel(target.label);
    setDrillDateRange({ start: target.quarterStart, end: target.quarterEnd });
  };

  const handleBack = () => {
    setSelectedYard(null);
    setDrillLabel('');
    setDrillDateRange(null);
  };

  const filteredPlan = useMemo(() => {
    if (!selectedYard) return allPlanData;
    return allPlanData.filter((r) => {
      if (!(r.resource || '').startsWith(selectedYard)) return false;
      if (drillDateRange) {
        const parseD = (d: string) => {
          if (!d) return null;
          if (/^\d{4}-\d{2}-\d{2}/.test(d)) { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day); }
          if (/^\d{2}-\d{2}-\d{4}/.test(d)) { const [day,m,y] = d.split('-').map(Number); return new Date(y,m-1,day); }
          return null;
        };
        const s = parseD(r.start_date);
        const e = parseD(r.end_date);
        if (!s || !e) return false;
        return s <= drillDateRange.end && e >= drillDateRange.start;
      }
      return true;
    });
  }, [allPlanData, selectedYard, drillDateRange]);

  const projectCount = new Set(allPlanData.map(r => r.project_id).filter(Boolean)).size;
  const yardCount = new Set(allPlanData.map(r => (r.resource || '').split(' - ')[0]).filter(Boolean)).size;

  if (isLoading) {
    return <div className="yo-page"><div className="yo-loading">Loading yard data…</div></div>;
  }

  return (
    <div className="yo-page">
      <div className="yo-header">
        <h1>Yard Overview</h1>
        <p className="yo-subtitle">
          {yardCount} yard groups · {allPlanData.length} tasks across {projectCount} vessel{projectCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="yo-content">
        {!selectedYard ? (
          <YardSummaryDashboard
            planData={allPlanData}
            onDrillDown={handleDrillDown}
            onSelectYard={(yard) => { setSelectedYard(yard); setDrillLabel(yard); setDrillDateRange(null); }}
            selectedYard={selectedYard}
          />
        ) : (
          <div>
            <div className="yo-breadcrumb">
              <button className="yo-back" onClick={handleBack}>← All Yards</button>
              <span className="yo-yard-name">{drillLabel || selectedYard}</span>
              <span className="yo-task-count">{filteredPlan.length} tasks</span>
            </div>
            <GanttChart
              key={`yard-${selectedYard}-${filteredPlan.length}`}
              planData={filteredPlan}
              humanPlanData={[]}
            />
          </div>
        )}
      </div>
    </div>
  );
};
