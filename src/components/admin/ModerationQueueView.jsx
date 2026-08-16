'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckSquare, 
  Filter, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  LoaderCircle, 
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Award,
  Users
} from 'lucide-react';
import { getModerationQueue, bulkModerationAction } from '@/lib/supabase-data';

export default function ModerationQueueView() {
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'join_requests' | 'certificates'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [moderationNote, setModerationNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setSelectedIds([]);
    const res = await getModerationQueue(activeTab, statusFilter);
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    setFeedback(null);

    const res = await bulkModerationAction(activeTab, action, selectedIds, moderationNote);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Successfully executed ${action.toUpperCase()} on ${res.updatedCount} item(s).`,
      });
      setSelectedIds([]);
      setModerationNote('');
      await fetchItems();
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to process request',
      });
    }
    setProcessing(false);
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.project_title && item.project_title.toLowerCase().includes(q)) ||
      (item.team_name && item.team_name.toLowerCase().includes(q)) ||
      (item.participant_name && item.participant_name.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.invitee_email && item.invitee_email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            Operational & Moderation Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time request moderation table for Join Requests, Project Submissions, and Certificate Issuances with bulk operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchItems}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'submissions'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Project Submissions
          </button>

          <button
            onClick={() => setActiveTab('join_requests')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'join_requests'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Join Requests
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'certificates'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Certificate Issuances
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved / Active</option>
            <option value="rejected">Rejected / Revoked</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Controls Banner */}
      {selectedIds.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-indigo-300 font-semibold">
            {selectedIds.length} item(s) selected for bulk moderation action:
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Optional moderation note..."
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none flex-1"
            />

            <button
              disabled={processing}
              onClick={() => handleBulkAction(activeTab === 'certificates' ? 'active' : 'approve')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Selected
            </button>

            <button
              disabled={processing}
              onClick={() => handleBulkAction(activeTab === 'certificates' ? 'revoke' : 'reject')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              {activeTab === 'certificates' ? 'Revoke Selected' : 'Reject Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs text-slate-400">Loading moderation records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-2">
            <p>No moderation requests match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="p-4 font-semibold">Details</th>
                  <th className="p-4 font-semibold">Entity / Target</th>
                  <th className="p-4 font-semibold">Submitted Date</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved' || item.status === 'accepted' || item.status === 'active';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-950/20' : ''}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                      </td>

                      {/* Details Column */}
                      <td className="p-4 font-medium text-white">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm">
                            {item.project_title || item.participant_name || item.team_name || item.id}
                          </div>
                          {item.project_description && (
                            <div className="text-slate-400 text-xs truncate max-w-xs">{item.project_description}</div>
                          )}
                          {item.invitee_email && (
                            <div className="text-slate-400 text-xs">{item.invitee_email}</div>
                          )}
                        </div>
                      </td>

                      {/* Entity / Target */}
                      <td className="p-4 text-slate-300">
                        <div className="space-y-0.5">
                          <div>{item.event_title || item.team_name || 'Event Target'}</div>
                          {item.repository_url && (
                            <a
                              href={item.repository_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-400 hover:underline text-[11px]"
                            >
                              Repo URL <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-400 text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isApproved 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : isPending 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {item.status || 'pending'}
                        </span>
                      </td>

                      {/* Single Item Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedIds([item.id]);
                              handleBulkAction(activeTab === 'certificates' ? 'active' : 'approve');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="Approve / Activate"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedIds([item.id]);
                              handleBulkAction(activeTab === 'certificates' ? 'revoke' : 'reject');
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Reject / Revoke"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
