'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Users, 
  FileCheck, 
  Award, 
  Eye, 
  Share2, 
  LoaderCircle, 
  RefreshCw,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { getProgramAnalytics } from '@/lib/supabase-data';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ProgramAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [eventIdFilter, setEventIdFilter] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    const data = await getProgramAnalytics(eventIdFilter || undefined);
    if (data) setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [eventIdFilter]);

  if (loading && !analytics) {
    return (
      <div className="py-20 text-center space-y-3">
        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading Program Analytics Engine...</p>
      </div>
    );
  }

  const funnel = analytics?.funnel || {
    totalRegistrations: 0,
    totalSubmissions: 0,
    totalCertificatesIssued: 0,
    regToSubConversionRate: 0,
    subToCertConversionRate: 0,
  };

  const engagement = analytics?.engagement || {
    verificationViews: 0,
    totalShares: 0,
    activeRate: 100,
  };

  const trends = analytics?.trends || {
    dates: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
    registrations: [12, 19, 25, 32, 45],
    submissions: [5, 10, 18, 24, 38],
    certificates: [2, 8, 15, 20, 35],
  };

  // Line Chart Data
  const lineChartData = {
    labels: trends.dates.length > 0 ? trends.dates : ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'Registrations',
        data: trends.registrations,
        borderColor: '#6366F1', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Submissions',
        data: trends.submissions,
        borderColor: '#A855F7', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Certificates Issued',
        data: trends.certificates,
        borderColor: '#EC4899', // Pink
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94A3B8' },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
    },
  };

  // Funnel Bar Chart Data
  const funnelBarData = {
    labels: ['Event Registrations', 'Active Submissions', 'Certificates Issued'],
    datasets: [
      {
        label: 'Participants',
        data: [funnel.totalRegistrations, funnel.totalSubmissions, funnel.totalCertificatesIssued],
        backgroundColor: ['#6366F1', '#A855F7', '#10B981'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Program Analytics & Credential Performance Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time conversion funnel tracking, verification engagement counters, and event participation metrics.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Registrations</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{funnel.totalRegistrations}</div>
          <div className="text-[11px] text-slate-400">Total event sign-ups</div>
        </div>

        {/* Submissions */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Submissions</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{funnel.totalSubmissions}</div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {funnel.regToSubConversionRate}% conversion rate
          </div>
        </div>

        {/* Certificates Issued */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Certificates Issued</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{funnel.totalCertificatesIssued}</div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {funnel.subToCertConversionRate}% issue rate
          </div>
        </div>

        {/* Credential Views & Engagement */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Verification Views</span>
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{engagement.verificationViews}</div>
          <div className="text-[11px] text-slate-400">
            {engagement.totalShares} total credential shares
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participation Trends Time-Series Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Event Participation & Credential Issuance Trends</h3>
          <div className="h-72">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Funnel Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Conversion Funnel Stages</h3>
          <div className="h-72">
            <Bar 
              data={funnelBarData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#94A3B8', fontSize: 10 } },
                  y: { ticks: { color: '#94A3B8' } },
                },
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
