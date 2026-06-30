"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity, GitBranch, Zap, AlertCircle, CheckCircle, Clock, RefreshCw, Target, Brain, Ticket, Trash2, Check, Loader, X, Play } from "lucide-react";

// ── Mock data for demo (replace with real API calls) ─────────────────────────
const MOCK_RUNS = [
  {
    id: "run-7821", branch: "main", commit: "a4f2c8d", triggered: "2026-06-15 12:30",
    status: "healed", total: 12, passed: 11, failed: 1, healed: 1, confidence: 87,
    jira: 0, duration: "4m 22s",
  },
  {
    id: "run-7820", branch: "feature/auth", commit: "c91b3e2", triggered: "2026-06-15 10:15",
    status: "failed", total: 12, passed: 8, failed: 4, healed: 2, confidence: 72,
    jira: 2, duration: "6m 48s",
  },
  {
    id: "run-7819", branch: "main", commit: "f30a1bb", triggered: "2026-06-15 08:00",
    status: "passed", total: 12, passed: 12, failed: 0, healed: 0, confidence: 100,
    jira: 0, duration: "2m 11s",
  },
  {
    id: "run-7818", branch: "fix/db-schema", commit: "e8c4d12", triggered: "2026-06-14 17:45",
    status: "failed", total: 12, passed: 6, failed: 6, healed: 3, confidence: 65,
    jira: 3, duration: "9m 03s",
  },
];

const MOCK_FAILURES = [
  {
    test: "test_create_user_wrong_status_code", type: "TEST_BUG", confidence: 94,
    priority: "Medium", healed: true,
    summary: "Assertion expected 200 but API returns 201 for creation.",
    fix: "Change `assert resp.status_code == 200` to `assert resp.status_code == 201`",
    commit: "c91b3e2", author: "Dev Team",
  },
  {
    test: "test_task_default_status_wrong_assertion", type: "TEST_BUG", confidence: 91,
    priority: "Medium", healed: true,
    summary: "Test asserts status == 'pending' but actual default is 'todo'.",
    fix: "Update assertion: `assert resp.json()['status'] == 'todo'`",
    commit: "c91b3e2", author: "Dev Team",
  },
  {
    test: "test_api_tasks_integration", type: "APP_BUG", confidence: 78,
    priority: "High", healed: false,
    summary: "Database constraint violation in task creation with duplicate project_id.",
    fix: "Review project FK constraint in tasks table — ensure cascade delete is configured.",
    commit: "a4f2c8d", author: "Backend Team",
  },
];

const TREND_DATA = [
  { day: "Mon", passed: 10, failed: 2, healed: 1 },
  { day: "Tue", passed: 12, failed: 0, healed: 0 },
  { day: "Wed", passed: 9,  failed: 3, healed: 2 },
  { day: "Thu", passed: 11, failed: 1, healed: 1 },
  { day: "Fri", passed: 8,  failed: 4, healed: 3 },
  { day: "Sat", passed: 12, failed: 0, healed: 0 },
  { day: "Sun", passed: 11, failed: 1, healed: 1 },
];

// ── Components ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, glow }: any) {
  return (
    <div className="stat-card card">
      <div className="flex items-start justify-between">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    passed: "badge-passed",
    healed: "badge-healed",
    failed: "badge-failed",
    running: "badge-running",
  };
  const icons: Record<string, any> = {
    passed: "✅", healed: "🔧", failed: "❌", running: "⏳",
  };
  return (
    <span className={`badge ${map[status] || map.failed}`}>
      {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const color = value >= 80 ? "#059669" : value >= 60 ? "#d97706" : "#dc2626";
  const r = 20, sw = 5, circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}>{value}%</span>
    </div>
  );
}

function BugTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    TEST_BUG: "badge-test-bug",
    APP_BUG:  "badge-app-bug",
    ENV_ISSUE: "badge-env-issue",
    FLAKY: "badge-flaky",
  };
  return (
    <span className={`badge ${map[type] || map.APP_BUG}`}>
      {type.replace("_", " ")}
    </span>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.isAggregated) {
      const dateFormatted = new Date(data.xVal).toLocaleDateString("en-US", {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 p-4 rounded-xl shadow-lg text-xs space-y-2.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="font-bold text-slate-800">{dateFormatted}</span>
            <span className="text-indigo-650 font-semibold">{data.runCount} Run(s)</span>
          </div>
          <div className="space-y-1 text-slate-600">
            <div className="flex justify-between gap-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Tests</span>
              <span className="font-medium text-slate-700">{data.totalCount}</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-1.5 grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-emerald-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-emerald-600">Passed</div>
              <div className="font-bold text-emerald-700">{data.passedCount} ({data.passed}%)</div>
            </div>
            <div className="bg-red-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-red-650">Failed</div>
              <div className="font-bold text-red-700">{data.failedCount} ({data.failed}%)</div>
            </div>
            <div className="bg-violet-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-violet-650">Healed</div>
              <div className="font-bold text-violet-750">{data.healedCount} ({data.healed}%)</div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 p-4 rounded-xl shadow-lg text-xs space-y-2.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="font-bold font-mono text-indigo-650">{data.runId}</span>
            <span className="text-slate-450 text-[10px]">{data.duration}</span>
          </div>
          <div className="space-y-1 text-slate-600">
            <div className="flex justify-between gap-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Triggered</span>
              <span className="font-medium text-slate-700">{data.timestamp}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Branch</span>
              <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-700 truncate max-w-[120px]" title={`${data.branch} (${data.commit})`}>
                {data.branch} ({data.commit})
              </span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-1.5 grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-emerald-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-emerald-600">Passed</div>
              <div className="font-bold text-emerald-700">{data.passedCount} ({data.passed}%)</div>
            </div>
            <div className="bg-red-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-red-650">Failed</div>
              <div className="font-bold text-red-700">{data.failedCount} ({data.failed}%)</div>
            </div>
            <div className="bg-violet-50/50 rounded p-1">
              <div className="text-[9px] uppercase font-bold text-violet-650">Healed</div>
              <div className="font-bold text-violet-750">{data.healedCount} ({data.healed}%)</div>
            </div>
          </div>
        </div>
      );
    }
  }
  return null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "failures" | "pipeline">("overview");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedFailure, setExpandedFailure] = useState<string | null>(null);

  const [runs, setRuns] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "7days" | "15days" | "month">("today");

  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [activeRunState, setActiveRunState] = useState<any>(null);
  const [testFiles, setTestFiles] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [runScope, setRunScope] = useState<"full" | "folder" | "file">("full");
  const [selectedFolder, setSelectedFolder] = useState<string>("tests/integration");
  const [selectedFile, setSelectedFile] = useState<string>("tests/integration/test_api_users.py");
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  // Dynamically extract unique test folders
  const testFolders = Array.from(new Set(testFiles.map(f => {
    const parts = f.split("/");
    return parts.slice(0, -1).join("/");
  }))).filter(Boolean);

  // Filter test files in the selected folder
  const filesInSelectedFolder = testFiles.filter(f => f.startsWith(selectedFolder + "/"));

  // Automatically update selectedFile if selectedFolder changes
  useEffect(() => {
    if (filesInSelectedFolder.length > 0 && !filesInSelectedFolder.includes(selectedFile)) {
      setSelectedFile(filesInSelectedFolder[0]);
    }
  }, [selectedFolder, testFiles]);

  useEffect(() => {
    async function loadTests() {
      try {
        const res = await fetch("/api/tests");
        const data = await res.json();
        if (data.tests && data.tests.length > 0) {
          setTestFiles(data.tests);
          if (data.tests.includes("tests/integration/test_api_users.py")) {
            setSelectedTest("tests/integration/test_api_users.py");
          } else {
            setSelectedTest(data.tests[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load tests", err);
      }
    }
    loadTests();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/reports", { cache: "no-store" });
        const data = await res.json();
        setRuns(data.runs || []);
        setFailures(data.failures || []);
        setTrend(data.trend || []);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    }
    async function checkStatus() {
      try {
        const res = await fetch("/api/trigger", { cache: "no-store" });
        const data = await res.json();
        setPipelineRunning(!!data.running);
        if (data.running) {
          setActiveRunState(data);
        } else {
          setActiveRunState(null);
        }
      } catch (err) {
        console.error("Failed to query status", err);
      }
    }
    loadData();
    checkStatus();
    // Poll more frequently (every 1 second) during execution to feel like real-time
    const interval = setInterval(() => {
      loadData();
      checkStatus();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerRun = async () => {
    if (isTriggering || pipelineRunning) return;
    setIsTriggering(true);
    
    let runCommand = "pytest tests/ -v --tb=short";
    if (runScope === "folder") {
      runCommand = `pytest ${selectedFolder} -v --tb=short`;
    } else if (runScope === "file") {
      runCommand = `pytest ${selectedFile} -v --tb=short`;
    }

    try {
      setActiveTab("pipeline"); // Switch tabs immediately
      setShowTriggerModal(false); // Close modal
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: runCommand }),
      });
      if (res.ok) {
        setPipelineRunning(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to trigger pipeline");
      }
    } catch (err) {
      console.error(err);
      alert("Error triggering run.");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleStopRun = async () => {
    if (!pipelineRunning) return;
    if (!confirm("Are you sure you want to stop the active pipeline execution?")) return;
    try {
      const res = await fetch("/api/trigger", {
        method: "DELETE",
      });
      if (res.ok) {
        setPipelineRunning(false);
        setActiveRunState(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to stop pipeline");
      }
    } catch (err) {
      console.error(err);
      alert("Error stopping run.");
    }
  };

  const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${runId}?`)) return;
    try {
      const res = await fetch(`/api/reports?id=${runId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRuns(prev => prev.filter(r => r.id !== runId));
        setFailures(prev => prev.filter(f => f.runId !== runId));
      } else {
        alert("Failed to delete run.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting run.");
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to clear ALL test runs and history data? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/reports?id=all`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRuns([]);
        setFailures([]);
      } else {
        alert("Failed to clear data.");
      }
    } catch (err) {
      console.error(err);
      alert("Error clearing data.");
    }
  };

  const filteredRuns = runs.filter(run => {
    const runDate = new Date(run.timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - runDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (timeFilter === "today") {
      return runDate.toDateString() === now.toDateString();
    }
    if (timeFilter === "7days") return diffDays <= 7;
    if (timeFilter === "15days") return diffDays <= 15;
    if (timeFilter === "month") return diffDays <= 30;
    return true;
  });

  const filteredFailures = failures.filter(f => {
    return filteredRuns.some(run => run.id === f.runId);
  });

  // Dynamically calculate KPIs based on filteredRuns
  const totalPassed = filteredRuns.reduce((a, r) => a + r.passed, 0);
  const totalFailed = filteredRuns.reduce((a, r) => a + r.failed, 0);
  const totalHealed = filteredRuns.reduce((a, r) => a + r.healed, 0);
  const avgConf = filteredRuns.length > 0 ? Math.round(filteredRuns.reduce((a, r) => a + r.confidence, 0) / filteredRuns.length) : 0;

  const getDynamicTrend = () => {
    // Sort chronologically (oldest first)
    const sorted = [...filteredRuns].sort((a, b) => a.timestamp - b.timestamp);
    
    if (timeFilter === "today") {
      return sorted.map(run => {
        const total = run.total || (run.passed + run.failed + run.healed) || 1;
        return {
          isAggregated: false,
          xVal: run.timestamp,
          runId: run.id,
          branch: run.branch,
          commit: run.commit,
          duration: run.duration,
          timestamp: run.triggered,
          passedCount: run.passed,
          failedCount: run.failed,
          healedCount: run.healed,
          passed: Math.round((run.passed / total) * 100),
          failed: Math.round((run.failed / total) * 100),
          healed: Math.round((run.healed / total) * 105) > 100 ? 100 : Math.round((run.healed / total) * 100), // Cap at 100
        };
      });
    } else {
      // Aggregate by calendar date
      const groups: { [dateStr: string]: any[] } = {};
      sorted.forEach(run => {
        const d = new Date(run.timestamp);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(run);
      });

      return Object.keys(groups).map(dateStr => {
        const runsInGroup = groups[dateStr];
        const sumPassed = runsInGroup.reduce((a, r) => a + r.passed, 0);
        const sumFailed = runsInGroup.reduce((a, r) => a + r.failed, 0);
        const sumHealed = runsInGroup.reduce((a, r) => a + r.healed, 0);
        const sumTotal = runsInGroup.reduce((a, r) => a + (r.total || (r.passed + r.failed + r.healed)), 0) || 1;
        
        const parts = dateStr.split("-");
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        
        return {
          isAggregated: true,
          xVal: dateObj.getTime(),
          dateStr,
          runCount: runsInGroup.length,
          passedCount: sumPassed,
          failedCount: sumFailed,
          healedCount: sumHealed,
          totalCount: sumTotal,
          passed: Math.round((sumPassed / sumTotal) * 100),
          failed: Math.round((sumFailed / sumTotal) * 100),
          healed: Math.round((sumHealed / sumTotal) * 105) > 100 ? 100 : Math.round((sumHealed / sumTotal) * 100),
        };
      });
    }
  };

  const getXAxisConfig = () => {
    const now = new Date();
    
    if (timeFilter === "today") {
      const todayRuns = filteredRuns.filter(r => {
        const d = new Date(r.timestamp);
        return d.toDateString() === now.toDateString();
      });
      
      let startTs: number;
      let endTs: number;
      
      if (todayRuns.length > 0) {
        const timestamps = todayRuns.map(r => r.timestamp);
        const minTs = Math.min(...timestamps);
        const maxTs = Math.max(...timestamps);
        
        // Pad by 1 hour on each side
        startTs = minTs - 1 * 60 * 60 * 1000;
        endTs = maxTs + 1 * 60 * 60 * 1000;
        
        // Ensure minimum range of 2 hours
        if (endTs - startTs < 2 * 60 * 60 * 1000) {
          const mid = (startTs + endTs) / 2;
          startTs = mid - 1 * 60 * 60 * 1000;
          endTs = mid + 1 * 60 * 60 * 1000;
        }
      } else {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        startTs = startOfDay.getTime();
        endTs = startTs + 24 * 60 * 60 * 1000;
      }
      
      // Calculate clean, standard step sizes
      const range = endTs - startTs;
      let step: number;
      if (range <= 3 * 3600 * 1000) {
        step = 30 * 60 * 1000; // 30 minutes
      } else if (range <= 6 * 3600 * 1000) {
        step = 60 * 60 * 1000; // 1 hour
      } else if (range <= 12 * 3600 * 1000) {
        step = 2 * 60 * 60 * 1000; // 2 hours
      } else {
        step = 3 * 60 * 60 * 1000; // 3 hours
      }

      // Align boundaries to standard step multiples
      startTs = Math.floor(startTs / step) * step;
      endTs = Math.ceil(endTs / step) * step;

      const ticks: number[] = [];
      for (let t = startTs; t <= endTs; t += step) {
        ticks.push(t);
      }
      
      return {
        domain: [startTs, endTs] as [number, number],
        ticks,
        tickFormatter: (tick: number) => {
          const d = new Date(tick);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      };
    }
    
    if (timeFilter === "7days") {
      const ticks: number[] = [];
      const startOfDay = new Date();
      startOfDay.setHours(12, 0, 0, 0); // Center at noon
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - i);
        ticks.push(d.getTime());
      }
      
      const startTs = ticks[0] - 12 * 60 * 60 * 1000;
      const endTs = startOfDay.getTime() + 12 * 60 * 60 * 1000;
      
      return {
        domain: [startTs, endTs] as [number, number],
        ticks,
        tickFormatter: (tick: number) => {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return days[new Date(tick).getDay()];
        }
      };
    }
    
    if (timeFilter === "15days") {
      const ticks: number[] = [];
      const startOfDay = new Date();
      startOfDay.setHours(12, 0, 0, 0);
      
      for (let i = 14; i >= 0; i -= 2) {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - i);
        ticks.push(d.getTime());
      }
      ticks.sort((a, b) => a - b);
      
      const startTs = startOfDay.getTime() - 14.5 * 24 * 60 * 60 * 1000;
      const endTs = startOfDay.getTime() + 0.5 * 24 * 60 * 60 * 1000;
      
      return {
        domain: [startTs, endTs] as [number, number],
        ticks,
        tickFormatter: (tick: number) => {
          const d = new Date(tick);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }
      };
    }
    
    if (timeFilter === "month") {
      const ticks: number[] = [];
      const startOfDay = new Date();
      startOfDay.setHours(12, 0, 0, 0);
      
      for (let i = 28; i >= 0; i -= 4) {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - i);
        ticks.push(d.getTime());
      }
      ticks.sort((a, b) => a - b);
      
      const startTs = startOfDay.getTime() - 29.5 * 24 * 60 * 60 * 1000;
      const endTs = startOfDay.getTime() + 0.5 * 24 * 60 * 60 * 1000;
      
      return {
        domain: [startTs, endTs] as [number, number],
        ticks,
        tickFormatter: (tick: number) => {
          const d = new Date(tick);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }
      };
    }
    
    // "all"
    const sorted = [...filteredRuns].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length === 0) {
      const startTs = Date.now() - 7 * 24 * 3600 * 1000;
      const endTs = Date.now();
      return {
        domain: [startTs, endTs] as [number, number],
        ticks: [startTs, endTs],
        tickFormatter: (tick: number) => {
          const d = new Date(tick);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }
      };
    }
    
    const startTs = sorted[0].timestamp - 12 * 3600 * 1000; // 12h padding
    const endTs = sorted[sorted.length - 1].timestamp + 12 * 3600 * 1000;
    
    const ticks = [
      startTs,
      startTs + (endTs - startTs) / 4,
      startTs + (endTs - startTs) / 2,
      startTs + 3 * (endTs - startTs) / 4,
      endTs
    ];
    
    return {
      domain: [startTs, endTs] as [number, number],
      ticks,
      tickFormatter: (tick: number) => {
        const d = new Date(tick);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }
    };
  };

  const getYAxisConfig = (trendData: any[]) => {
    return {
      domain: [0, 100] as [number, number],
      ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    };
  };

  const dynamicTrend = getDynamicTrend();
  const xAxisConfig = getXAxisConfig();
  const yAxisConfig = getYAxisConfig(dynamicTrend);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-6 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">RegressionAI</h1>
              <p className="text-[11px] text-slate-500 font-medium">AI-Powered CI/CD Regression Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pipelineRunning ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-150">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-xs text-indigo-700 font-semibold">Pipeline Running...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-150">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-semibold">Pipeline Active</span>
              </div>
            )}
            {pipelineRunning ? (
              <button 
                onClick={handleStopRun}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-700"
              >
                <div className="w-2.5 h-2.5 bg-white rounded-sm animate-pulse" />
                Stop Pipeline
              </button>
            ) : (
              <button 
                onClick={() => setShowTriggerModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-indigo-600 hover:bg-indigo-750 text-white shadow-sm border border-indigo-700"
              >
                <RefreshCw size={14} />
                Trigger Run
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-6 md:px-8 py-8 space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in">
          <StatCard label="Total Passed" value={totalPassed} sub="across all runs"
            icon={CheckCircle} color="bg-emerald-600" />
          <StatCard label="Failures" value={totalFailed} sub={`${totalHealed} healed by AI`}
            icon={AlertCircle} color="bg-red-600" />
          <StatCard label="AI Healed" value={totalHealed} sub="auto-fixed by pipeline"
            icon={Zap} color="bg-violet-600" />
          <StatCard label="Avg Confidence" value={`${avgConf}%`} sub="AI certainty score"
            icon={Target} color="bg-indigo-600" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit">
          {(["overview", "failures", "pipeline"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === t
                  ? "bg-white text-indigo-600 shadow-sm border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}>{t}</button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in">
            {/* Trend chart */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity size={18} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800">
                  {timeFilter === "today" ? "Today's Test Trend (Hourly)" 
                   : timeFilter === "7days" ? "7-Day Test Trend" 
                   : timeFilter === "15days" ? "15-Day Test Trend" 
                   : timeFilter === "month" ? "30-Day Test Trend" 
                   : "Overall Test Trend"}
                </h2>
                <div className="flex gap-3 ml-auto text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Passed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Failed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Healed</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dynamicTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    type="number"
                    dataKey="xVal" 
                    domain={xAxisConfig.domain} 
                    ticks={xAxisConfig.ticks} 
                    tickFormatter={xAxisConfig.tickFormatter}
                    stroke="#cbd5e1" 
                    tick={{ fill: "#64748b", fontSize: 11 }} 
                  />
                  <YAxis 
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="#cbd5e1" 
                    tick={{ fill: "#64748b", fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="passed" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "#ffffff" }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="failed" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "#ffffff" }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="healed" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "#ffffff" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Run list */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-slate-500" />
                  <h2 className="font-bold text-slate-800">Recent Runs</h2>
                  <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">{filteredRuns.length}</span>
                </div>
                
                {/* Time filter selector & Clear All */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs">
                    {([
                      { id: "today", label: "Today" },
                      { id: "7days", label: "7 Days" },
                      { id: "15days", label: "15 Days" },
                      { id: "month", label: "Month" },
                    ] as const).map(f => (
                      <button key={f.id} onClick={(e) => { e.stopPropagation(); setTimeFilter(f.id); }}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          timeFilter === f.id
                            ? "bg-white text-indigo-600 shadow-sm border-slate-200"
                            : "text-slate-500 hover:text-slate-900"
                        }`}>{f.label}</button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {filteredRuns.length === 0 ? (
                <div className="card p-8 text-center text-slate-500 text-sm">
                  No runs found in the selected time window.
                </div>
              ) : (
                filteredRuns.map(run => (
                  <div key={run.id}
                    className={`run-row card cursor-pointer border border-slate-200 ${
                      run.status === "passed" ? "passed"
                      : run.status === "healed" ? "healed"
                      : "failed"
                    }`}
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                    <div className="flex items-center gap-4 p-4">
                      <ConfidenceRing value={run.confidence} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-sm font-mono text-slate-900">{run.id}</span>
                          <StatusBadge status={run.status} />
                          {run.jira_tickets && run.jira_tickets.length > 0 && (
                            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {run.jira_tickets.map((t: any) => (
                                <a
                                  key={t.id}
                                  href={t.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                  title="Open Jira ticket"
                                >
                                  <Ticket size={12} />
                                  {t.id}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><GitBranch size={11} className="text-slate-400" />{run.branch}</span>
                          <span className="font-mono text-slate-650">{run.commit}</span>
                          <span className="flex items-center gap-1"><Clock size={11} className="text-slate-400" />{run.duration}</span>
                          <span>{run.triggered}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-4 text-center text-xs hidden md:flex">
                          <div>
                            <div className="text-slate-800 font-bold text-base">{run.total}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Total</div>
                          </div>
                          <div>
                            <div className="text-emerald-600 font-bold text-base">{Math.max(0, run.total - run.failed - run.healed)}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Already Passed</div>
                          </div>
                          <div>
                            <div className="text-violet-600 font-bold text-base">{run.healed}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Healed</div>
                          </div>
                          <div>
                            <div className="text-red-650 font-bold text-base">{run.failed}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Failed</div>
                          </div>
                          <div>
                            <div className="text-emerald-700 font-bold text-base">{run.passed}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Final Passed</div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteRun(e, run.id)}
                          className="p-2 rounded-lg text-slate-450 hover:text-red-600 hover:bg-slate-100 transition-all"
                          title="Delete Run"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {expandedRun === run.id && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {[
                            { k: "Total Tests", v: run.total, color: "text-slate-800" },
                            { k: "Already Passed", v: Math.max(0, run.total - run.failed - run.healed), color: "text-emerald-600" },
                            { k: "Healed by AI", v: run.healed, color: "text-violet-600" },
                            { k: "Failed (Not Healed)", v: run.failed, color: "text-red-600" },
                            { k: "Total Final Passed", v: run.passed, color: "text-emerald-700 font-bold" },
                          ].map(({ k, v, color }) => (
                            <div key={k} className="bg-white border border-slate-200/60 rounded-lg p-3">
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{k}</div>
                              <div className={`font-bold text-lg mt-1 ${color || "text-slate-800"}`}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {run.jira_tickets && run.jira_tickets.length > 0 && (
                          <div className="bg-white border border-slate-200/60 rounded-lg p-3">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">🎫 Created Jira Tickets</div>
                            <div className="flex flex-wrap gap-2">
                              {run.jira_tickets.map((t: any) => (
                                <a
                                  key={t.id}
                                  href={t.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  <Ticket size={13} />
                                  {t.id} (Open in Jira)
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Failures Tab ── */}
        {activeTab === "failures" && (
          <div className="space-y-4 animate-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600" />
              <h2 className="font-bold text-slate-800">Failure Analysis — AI Results</h2>
            </div>
            {filteredFailures.length === 0 ? (
              <div className="card p-8 text-center text-slate-500 text-sm">
                No failures recorded in the selected time window.
              </div>
            ) : (
              filteredFailures.map((f, i) => (
                <div key={i}
                  className={`card cursor-pointer overflow-hidden border border-slate-200`}
                  onClick={() => setExpandedFailure(expandedFailure === f.test ? null : f.test)}>
                  <div className="flex items-center gap-4 p-4">
                    <ConfidenceRing value={f.confidence} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-slate-800 font-semibold truncate">{f.test}</span>
                        <BugTypeBadge type={f.type} />
                        <span className={`badge ${
                          f.priority === "High" ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-yellow-50 border-yellow-250 text-yellow-800"
                        }`}>{f.priority}</span>
                        {f.healed
                          ? <span className="badge badge-healed flex items-center gap-1"><Zap size={11} />AI Healed</span>
                          : <span className="badge badge-failed flex items-center gap-1"><AlertCircle size={11} />Unhealed</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{f.summary}</p>
                    </div>
                  </div>

                  {expandedFailure === f.test && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-red-50 border border-red-150 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">🔴 Failure Summary</span>
                          </div>
                          <p className="text-sm text-slate-700">{f.summary}</p>
                        </div>
                        <div className="bg-violet-50 border border-violet-150 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge badge-ai">AI</span>
                            <span className="text-xs font-bold text-violet-750 uppercase tracking-wider">Suggested Fix</span>
                          </div>
                          <p className="text-xs text-slate-700 font-mono bg-white border border-slate-200/60 p-2.5 rounded-lg mt-1.5 leading-relaxed">{f.fix}</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">📍 Root Cause</span>
                          </div>
                          <div className="space-y-1.5 text-xs mt-2">
                            <div className="text-slate-600">Commit: <span className="font-mono text-indigo-700 font-bold">{f.commit}</span></div>
                            <div className="text-slate-600">Author: <span className="text-slate-800 font-semibold">{f.author}</span></div>
                            <div className="text-slate-600">Confidence: <span className="text-indigo-700 font-bold">{f.confidence}%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Pipeline Tab ── */}
        {activeTab === "pipeline" && (
          <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Activity size={18} className="text-indigo-600" /> 
                {pipelineRunning ? "Active Run Pipeline Execution" : "AI Regression Pipeline Flow"}
              </h2>
              {pipelineRunning && activeRunState && (
                <span className="text-xs text-slate-500 font-mono">Run ID: {activeRunState.run_id}</span>
              )}
            </div>

            {pipelineRunning && activeRunState ? (
              <div className="card p-8 border border-slate-200 space-y-8">
                {/* Active Stage Info & Progress Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Active Pipeline Run</span>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">Stage: {activeRunState.stage}</h3>
                    <p className="text-sm text-slate-500 font-mono mt-1">{activeRunState.message}</p>
                  </div>
                  <div className="w-full sm:w-64 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-indigo-600">Pipeline Progress</span>
                      <span className="text-slate-800">{activeRunState.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${activeRunState.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Horizontal Pipeline flow (GitLab Style) */}
                <div className="overflow-x-auto pb-4 scrollbar-thin">
                  <div className="flex items-center justify-between min-w-[950px] px-4">
                    {[
                      { name: "Initialization", range: [0, 9] },
                      { name: "Running Tests", range: [10, 24] },
                      { name: "Parsing Failures", range: [25, 39] },
                      { name: "Fetching Files", range: [40, 54] },
                      { name: "Analyzing Failures", range: [55, 69] },
                      { name: "Self Healing", range: [70, 84] },
                      { name: "Root Cause Analysis", range: [85, 91] },
                      { name: "Jira Ticketing", range: [92, 100] },
                    ].map((stage, idx, arr) => {
                      const isCompleted = activeRunState.percentage > stage.range[1];
                      const isActive = activeRunState.percentage >= stage.range[0] && activeRunState.percentage <= stage.range[1];

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center relative">
                          {/* Connecting Arrow Line */}
                          {idx < arr.length - 1 && (
                            <div className="absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 flex items-center z-0">
                              <div className={`h-[2px] w-full rounded transition-all duration-300 ${
                                isCompleted ? "bg-emerald-500" : isActive ? "bg-gradient-to-r from-indigo-500 to-slate-250" : "bg-slate-200"
                              }`} />
                              <div className={`w-1.5 h-1.5 border-t-2 border-r-2 transform rotate-45 -ml-1.5 transition-all duration-300 ${
                                isCompleted ? "border-emerald-500" : isActive ? "border-indigo-400" : "border-slate-200"
                              }`} />
                            </div>
                          )}

                          {/* Node Circle */}
                          <div className={`stage-circle ${
                            isCompleted ? "done"
                            : isActive ? "active"
                            : "pending"
                          }`}>
                            {isCompleted ? (
                              <Check size={18} className="stroke-[3]" />
                            ) : isActive ? (
                              <Loader size={18} className="animate-spin" />
                            ) : (
                              <span className="text-sm font-bold">{idx + 1}</span>
                            )}
                          </div>
                          <span className={`text-xs font-bold mt-3 text-center truncate w-24 z-10 ${
                            isActive ? "text-indigo-600 font-bold" : isCompleted ? "text-slate-800" : "text-slate-400"
                          }`}>{stage.name}</span>
                          <span className={`text-[10px] mt-1 uppercase tracking-wider font-semibold z-10 ${
                            isActive ? "text-indigo-500 animate-pulse" : isCompleted ? "text-emerald-600" : "text-slate-450"
                          }`}>
                            {isCompleted ? "Done" : isActive ? "Running" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Default Pipeline Flow View (when idle)
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { step: 1, name: "Regression Execution", icon: "🧪", desc: "pytest runs all test suites", ai: false },
                    { step: 2, name: "Failure Analysis", icon: "🔍", desc: "Classifies TEST_BUG vs APP_BUG", ai: true, detail: "LLM categorizes failure into code, test, or env issue" },
                    { step: 3, name: "Self-Healing", icon: "🔧", desc: "Auto-fixes and re-runs tests", ai: true, detail: "Generates code fixes & validates them dynamically" },
                    { step: 4, name: "Root Cause", icon: "🔬", desc: "git blame + commit analysis", ai: true, detail: "Identifies breaking commit & author details" },
                  ].map(node => (
                    <div key={node.step} className={`pipeline-node card ${
                      node.ai ? "ai-node" : "border-slate-200"
                    }`}>
                      {node.ai && (
                        <div className="absolute top-3 right-3">
                          <span className="badge badge-ai">AI</span>
                        </div>
                      )}
                      <div className="text-3xl mb-3">{node.icon}</div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">{node.name}</h3>
                      <p className="text-xs text-slate-500 mb-2">{node.desc}</p>
                      {node.ai && node.detail && (
                        <div className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200/60 mt-1">
                          💡 {node.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { step: 5, name: "Action Recommendation", icon: "💡", desc: "Priority + effort estimate per failure", ai: true, detail: "Estimates resolution effort & provides instructions" },
                    { step: 6, name: "Jira Ticketing", icon: "🎫", desc: "Auto-creates structured bug tickets", ai: true, detail: "Generates rich Jira tickets with blame and solution" },
                  ].map(node => (
                    <div key={node.step} className="pipeline-node ai-node card">
                      <div className="absolute top-3 right-3"><span className="badge badge-ai">AI</span></div>
                      <div className="text-3xl mb-3">{node.icon}</div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">{node.name}</h3>
                      <p className="text-xs text-slate-500 mb-2">{node.desc}</p>
                      <div className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200/60 mt-1">💡 {node.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showTriggerModal && (
        <div className="modal-backdrop">
          <div className="modal-box w-full max-w-lg space-y-6 relative">
            <button 
              onClick={() => setShowTriggerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-200 text-indigo-650">
                <Play size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Trigger Regression Run</h3>
                <p className="text-xs text-slate-500">Configure execution scope for the autonomous pipeline</p>
              </div>
            </div>

            {/* Scope selection cards */}
            <div className="space-y-3">
              {[
                { id: "full", title: "Full Suite", desc: "Run all tests inside the tests directory", icon: "📦" },
                { id: "folder", title: "Test Folder", desc: "Run all tests in a selected subdirectory", icon: "📁" },
                { id: "file", title: "Single Test File", desc: "Execute a single specific test file", icon: "📄" },
              ].map((scope) => (
                <label 
                  key={scope.id}
                  onClick={() => setRunScope(scope.id as any)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    runScope === scope.id 
                      ? "bg-indigo-50/50 border-indigo-500 text-slate-800 shadow-sm" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/50 text-slate-700"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="runScope" 
                    checked={runScope === scope.id}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  <span className="text-2xl mt-0.5">{scope.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{scope.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{scope.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Dynamic Dropdowns */}
            {runScope !== "full" && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 animate-in">
                {/* Folder Selector (shown for both folder and file scope) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Select Folder</label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="form-select cursor-pointer font-mono"
                  >
                    {testFolders.map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                  </select>
                </div>

                {/* File Selector (shown only for file scope) */}
                {runScope === "file" && (
                  <div className="space-y-1.5 animate-in">
                    <label className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Select File</label>
                    <select
                      value={selectedFile}
                      onChange={(e) => setSelectedFile(e.target.value)}
                      className="form-select cursor-pointer font-mono"
                    >
                      {filesInSelectedFolder.map(file => (
                        <option key={file} value={file}>
                          {file.split("/").pop()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setShowTriggerModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleTriggerRun}
                disabled={isTriggering}
                className={`btn btn-primary btn-sm ${
                  isTriggering ? "cursor-not-allowed opacity-50" : "bg-indigo-600 hover:bg-indigo-500 glow-blue"
                }`}
              >
                {isTriggering ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Play size={14} className="fill-white" />
                )}
                Start Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
