import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  RotateCcw,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import {
  fetchDashboardAnalytics,
  fetchDashboardLists,
  fetchStats,
} from '../services/fileService';
import { fetchAllUsers } from '../services/userService';
import {
  formatCompactCount,
  formatCompactRupee,
  formatFullCount,
  formatFullRupee,
  formatRupeeAxisTick,
} from '../lib/formatNumber';
import { getApiError } from '../lib/apiError';
import ObjectionReminderBanner from '../components/ObjectionReminderBanner';
import { useOverdueObjections } from '@/context/OverdueObjectionContext';
import StatCard from '../components/StatCard';
import StaffTodayFilesTable from '../components/StaffTodayFilesTable';
import EmptyData from '../components/EmptyData';
import type { FileRecord, FileStats } from '@/types/file.types';
import type { User } from '@/types/user.types';

interface BreakdownItem {
  name: string;
  value: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: { sub?: string }; value?: number }>;
  label?: string;
  valueFormatter?: (value: number) => string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  total: number;
}

function localDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultChartDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { dateFrom: localDateInputValue(start), dateTo: localDateInputValue(end) };
}

function formatChartRangeLabel(dateFrom: string, dateTo: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  if (dateTo) return `Until ${fmt(dateTo)}`;
  return 'Custom range';
}

const CHART_COLORS = {
  records: '#1a73e8',
  payment: '#1d7f50',
  grid: '#eef0f3',
  axis: '#667488',
};

const pct = (part: number | undefined, total: number) =>
  total > 0 ? Math.round(((part ?? 0) / total) * 100) : 0;

const FILE_TAB_LINKS = {
  total: 'all',
  pending: 'pending',
  inProgress: 'in_progress',
  hold: 'hold',
  objection: 'objection',
  completed: 'completed',
  returnPaper: 'return_paper',
};

function topWorkTypes(data: BreakdownItem[], limit = 5) {
  if (data.length <= limit) return data;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);
  if (rest > 0) {
    top.push({ name: 'Other', value: rest, color: '#9aa3b2' });
  }
  return top;
}

function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="crm-chart-tooltip">
      <p className="crm-chart-tooltip-title">{row?.sub || label}</p>
      <p className="crm-chart-tooltip-value">
        {valueFormatter && payload[0].value != null
          ? valueFormatter(payload[0].value)
          : payload[0].value}
      </p>
    </div>
  );
}

function PieTooltip({ active, payload, total }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const share = total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0;
  return (
    <div className="crm-chart-tooltip">
      <p className="crm-chart-tooltip-title">{item.name}</p>
      <p className="crm-chart-tooltip-value">
        {item.value} records · {share}%
      </p>
    </div>
  );
}

function LegendList({ data, total }: { data: BreakdownItem[]; total: number }) {
  return (
    <ul className="crm-chart-legend">
      {data.map((item) => (
        <li key={item.name} className="crm-chart-legend-item">
          <span className="crm-chart-legend-dot" style={{ background: item.color }} />
          <span className="crm-chart-legend-name">{item.name}</span>
          <span className="crm-chart-legend-val">
            {item.value}
            <span className="crm-chart-legend-pct">
              ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { overdueCount } = useOverdueObjections();
  const navigate = useNavigate();
  const [chartDateFrom, setChartDateFrom] = useState(() => defaultChartDateRange().dateFrom);
  const [chartDateTo, setChartDateTo] = useState(() => defaultChartDateRange().dateTo);
  const chartRangeLabel = formatChartRangeLabel(chartDateFrom, chartDateTo);
  const [chartData, setChartData] = useState<Array<Record<string, string | number>>>([]);
  const [statusData, setStatusData] = useState<BreakdownItem[]>([]);
  const [workData, setWorkData] = useState<BreakdownItem[]>([]);
  const [staffTodayFiles, setStaffTodayFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [filterUserId, setFilterUserId] = useState('');
  const [ownerUsers, setOwnerUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isAdmin || !user) return;
    fetchAllUsers()
      .then(setOwnerUsers)
      .catch(() => setOwnerUsers([]));
  }, [isAdmin, user]);

  const listOpts = useMemo(
    () => (isAdmin && filterUserId ? { filterUserId } : {}),
    [isAdmin, filterUserId]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [statData, analyticsData, listsData] = await Promise.all([
        fetchStats(user, listOpts),
        fetchDashboardAnalytics(user, {
          ...listOpts,
          dateFrom: chartDateFrom,
          dateTo: chartDateTo,
        }),
        fetchDashboardLists(user, listOpts),
      ]);
      setStats(statData);
      setChartData((analyticsData.chart || []) as Array<Record<string, string | number>>);
      setStatusData(analyticsData.statusBreakdown || []);
      setWorkData(topWorkTypes(analyticsData.workTypeBreakdown || []));
      setStaffTodayFiles(listsData.staffTodayFiles || []);
    } catch (err) {
      setError(getApiError(err, 'Failed to load dashboard data. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [user, listOpts, chartDateFrom, chartDateTo]);

  useEffect(() => {
    load();
  }, [load]);

  // All KPI counts are served by the backend dashboard stats API.
  // Total Records leaves out Paper Return; that status has its own card.
  const s = stats || {};
  const allRecords = s.totalRecords ?? 0;
  const total = Math.max(0, allRecords - (s.returnPaper ?? 0));
  const totalPayment = s.totalBilling ?? 0;
  const activePipeline = s.live ?? (s.pending ?? 0) + (s.inProcess ?? 0);

  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);
  const workTotal = workData.reduce((sum, item) => sum + item.value, 0);
  const maxRecords = Math.max(...chartData.map((d) => Number(d.records) || 0), 1);
  const billingTrendTotal = chartData.reduce((sum, d) => sum + (Number(d.payment) || 0), 0);

  const goToFiles = (tab: string) => {
    const params = new URLSearchParams({ tab });
    if (isAdmin && filterUserId) params.set('userId', filterUserId);
    navigate(`/files?${params.toString()}`);
  };

  const staffStatCards = (
    <>
      <StatCard
        label="Total Records"
        value={formatCompactCount(total)}
        valueTitle={formatFullCount(total)}
        meta={`${activePipeline} active in pipeline · View records`}
        icon={FileText}
        tone="blue"
        onClick={() => goToFiles(FILE_TAB_LINKS.total)}
      />
      <StatCard
        label="Pending"
        value={formatCompactCount(s.pending ?? 0)}
        valueTitle={formatFullCount(s.pending ?? 0)}
        meta={`${pct(s.pending, total)}% of your records · View`}
        icon={Clock}
        tone="red"
        onClick={() => goToFiles(FILE_TAB_LINKS.pending)}
      />
      <StatCard
        label="In Process"
        value={formatCompactCount(s.inProcess ?? 0)}
        valueTitle={formatFullCount(s.inProcess ?? 0)}
        meta={`${pct(s.inProcess, total)}% of your records · View`}
        icon={Loader2}
        tone="orange"
        onClick={() => goToFiles(FILE_TAB_LINKS.inProgress)}
      />
      <StatCard
        label="Hold Sheet"
        value={formatCompactCount(s.holdSheet ?? 0)}
        valueTitle={formatFullCount(s.holdSheet ?? 0)}
        meta="Manually marked on hold · View records"
        icon={PauseCircle}
        tone="sky"
        onClick={() => goToFiles(FILE_TAB_LINKS.hold)}
      />
      <StatCard
        label="Completed"
        value={formatCompactCount(s.completed ?? 0)}
        valueTitle={formatFullCount(s.completed ?? 0)}
        meta={`${pct(s.completed, total)}% of your records · View`}
        icon={CheckCircle2}
        tone="green"
        onClick={() => goToFiles(FILE_TAB_LINKS.completed)}
      />
    </>
  );

  return (
    <div className={`crm-page crm-dashboard crm-page--dashboard ${isAdmin ? '' : 'crm-dashboard--staff'}`}>
      <div className="crm-page-head-row crm-dashboard-head">
        <div className="crm-page-head">
          <h1 className="crm-title">Dashboard</h1>
        </div>

        {isAdmin ? (
          <div className="crm-dashboard-controls print:hidden">
            <select
              className="crm-dashboard-control"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              aria-label="Filter by user"
            >
              <option value="">All users</option>
              {ownerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>

            <label className="crm-dashboard-date-label">
              <span>Start</span>
              <input
                type="date"
                className="crm-dashboard-control crm-dashboard-control--date"
                value={chartDateFrom}
                max={chartDateTo || undefined}
                onChange={(e) => setChartDateFrom(e.target.value)}
                aria-label="Start date"
              />
            </label>

            <label className="crm-dashboard-date-label">
              <span>End</span>
              <input
                type="date"
                className="crm-dashboard-control crm-dashboard-control--date"
                value={chartDateTo}
                min={chartDateFrom || undefined}
                max={localDateInputValue(new Date())}
                onChange={(e) => setChartDateTo(e.target.value)}
                aria-label="End date"
              />
            </label>
          </div>
        ) : null}
      </div>

      <ObjectionReminderBanner />

      <div className="crm-dashboard-body">

      {error && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#f8e4e4] bg-[#fef7f7] px-4 py-3 text-[13px] text-[#c40020]"
          role="alert"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="crm-btn crm-btn--secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <RotateCcw size={14} />
            {loading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      <div className="crm-dashboard-kpis crm-animate-stagger">
        {isAdmin ? (
          <>
            <StatCard
              label="Total Records"
              value={formatCompactCount(total)}
              valueTitle={formatFullCount(total)}
              meta={`${activePipeline} active in pipeline · View records`}
              icon={FileText}
              tone="blue"
              onClick={() => goToFiles(FILE_TAB_LINKS.total)}
            />
            <StatCard
              label="Pending"
              value={formatCompactCount(s.pending ?? 0)}
              valueTitle={formatFullCount(s.pending ?? 0)}
              meta={`${pct(s.pending, total)}% of total · View records`}
              icon={Clock}
              tone="red"
              onClick={() => goToFiles(FILE_TAB_LINKS.pending)}
            />
            <StatCard
              label="In Process"
              value={formatCompactCount(s.inProcess ?? 0)}
              valueTitle={formatFullCount(s.inProcess ?? 0)}
              meta={`${pct(s.inProcess, total)}% of total · View records`}
              icon={Loader2}
              tone="orange"
              onClick={() => goToFiles(FILE_TAB_LINKS.inProgress)}
            />
            <StatCard
              label="Hold Sheet"
              value={formatCompactCount(s.holdSheet ?? 0)}
              valueTitle={formatFullCount(s.holdSheet ?? 0)}
              meta="Manually marked on hold · View records"
              icon={PauseCircle}
              tone="sky"
              onClick={() => goToFiles(FILE_TAB_LINKS.hold)}
            />
            <StatCard
              label="Objection"
              value={formatCompactCount(s.objection ?? 0)}
              valueTitle={formatFullCount(s.objection ?? 0)}
              meta={
                overdueCount > 0
                  ? `${overdueCount} need action (3+ days) · View records`
                  : `${pct(s.objection, total)}% of total · View records`
              }
              icon={AlertCircle}
              tone="purple"
              onClick={() => goToFiles(FILE_TAB_LINKS.objection)}
            />
            <StatCard
              label="Completed"
              value={formatCompactCount(s.completed ?? 0)}
              valueTitle={formatFullCount(s.completed ?? 0)}
              meta={`${pct(s.completed, total)}% of total · View records`}
              icon={CheckCircle2}
              tone="green"
              onClick={() => goToFiles(FILE_TAB_LINKS.completed)}
            />
            <StatCard
              label="Return Paper"
              value={formatCompactCount(s.returnPaper ?? 0)}
              valueTitle={formatFullCount(s.returnPaper ?? 0)}
              meta={`${pct(s.returnPaper, allRecords)}% of total · View records`}
              icon={RotateCcw}
              tone="default"
              onClick={() => goToFiles(FILE_TAB_LINKS.returnPaper)}
            />
            <StatCard
              label="Total Billing"
              value={formatCompactRupee(totalPayment)}
              valueTitle={formatFullRupee(totalPayment)}
              meta={`Across ${formatFullCount(allRecords)} records`}
              icon={IndianRupee}
              tone="gold"
              readOnly
            />
          </>
        ) : (
          staffStatCards
        )}
      </div>

      <div className="crm-dashboard-charts crm-animate-stagger-slow">
        {isAdmin && (
          <>
            <div className="crm-chart-card">
              <div className="crm-chart-card-head">
                <div>
                  <h2 className="crm-chart-title">Records trend</h2>
                  <p className="crm-chart-sub">New files — {chartRangeLabel}</p>
                </div>
                <span className="crm-chart-badge" title={formatFullCount(maxRecords)}>
                  Peak {formatCompactCount(maxRecords)}
                </span>
              </div>
              <div className="crm-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(26, 115, 232, 0.06)' }}
                      content={<ChartTooltip valueFormatter={(v) => `${v} records`} />}
                    />
                    <Bar
                      dataKey="records"
                      fill={CHART_COLORS.records}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                      isAnimationActive
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="crm-chart-card">
              <div className="crm-chart-card-head">
                <div>
                  <h2 className="crm-chart-title">Billing trend</h2>
                  <p className="crm-chart-sub">Total bill amount — {chartRangeLabel}</p>
                </div>
                <span
                  className="crm-chart-badge crm-chart-badge--green"
                  title={formatFullRupee(billingTrendTotal)}
                >
                  {formatCompactRupee(billingTrendTotal)}
                </span>
              </div>
              <div className="crm-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={56}
                      tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatRupeeAxisTick}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(29, 127, 80, 0.06)' }}
                      content={<ChartTooltip valueFormatter={formatFullRupee} />}
                    />
                    <Bar
                      dataKey="payment"
                      fill={CHART_COLORS.payment}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                      isAnimationActive
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {!isAdmin && (
          <div className="crm-chart-card crm-chart-card--staff-today">
            <div className="crm-chart-card-head">
              <div>
                <h2 className="crm-chart-title">Today&apos;s new entries</h2>
                <p className="crm-chart-sub">Table view — new files created today</p>
              </div>
              <span className="crm-chart-badge" title={formatFullCount(staffTodayFiles.length)}>
                {formatCompactCount(staffTodayFiles.length)} new
              </span>
            </div>
            <div className="crm-chart-body crm-chart-body--table">
              <StaffTodayFilesTable files={staffTodayFiles} />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="crm-chart-card">
            <div className="crm-chart-card-head">
              <div>
                <h2 className="crm-chart-title">Status distribution</h2>
                <p className="crm-chart-sub">Share of all records by status</p>
              </div>
              <span className="crm-chart-badge" title={formatFullCount(statusTotal)}>
                {formatCompactCount(statusTotal)} total
              </span>
            </div>
            <div className="crm-chart-body crm-chart-body--split">
              {statusData.length ? (
                <>
                  <div className="crm-chart-pie">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="#fff"
                          strokeWidth={2}
                          isAnimationActive
                          animationDuration={900}
                        >
                          {statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip total={statusTotal} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <LegendList data={statusData} total={statusTotal} />
                </>
              ) : (
                <EmptyData
                  title="No status data available"
                  description="Records will appear here once files are added."
                  compact
                  showIllustration={false}
                  className="crm-empty-data--chart"
                />
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="crm-chart-card">
            <div className="crm-chart-card-head">
              <div>
                <h2 className="crm-chart-title">Work type mix</h2>
                <p className="crm-chart-sub">Top work types across records</p>
              </div>
              <span className="crm-chart-badge" title={formatFullCount(workTotal)}>
                {formatCompactCount(workTotal)} total
              </span>
            </div>
            <div className="crm-chart-body crm-chart-body--split">
              {workData.length ? (
                <>
                  <div className="crm-chart-pie">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={workData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="#fff"
                          strokeWidth={2}
                          isAnimationActive
                          animationDuration={900}
                        >
                          {workData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip total={workTotal} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <LegendList data={workData} total={workTotal} />
                </>
              ) : (
                <EmptyData
                  title="No work type data available"
                  description="Work type breakdown will show when records exist."
                  compact
                  showIllustration={false}
                  className="crm-empty-data--chart"
                />
              )}
            </div>
          </div>
        )}
      </div>
      </div>

    </div>
  );
}
