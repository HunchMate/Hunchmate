import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BellRing, LoaderCircle, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listAdminComplaints, updateComplaintStatus } from '../../lib/firebase-data';
import './Complaints.css';

const STATUS_OPTIONS = ['raised', 'in-progress', 'resolved'];

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function toStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'resolved') return 'Resolved';
  return 'Raised';
}

function statusClass(status) {
  if (status === 'resolved') return 'admin-complaints__pill admin-complaints__pill--success';
  if (status === 'in-progress') return 'admin-complaints__pill admin-complaints__pill--warn';
  return 'admin-complaints__pill admin-complaints__pill--danger';
}

export default function AdminComplaints() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [metrics, setMetrics] = useState({ raised: 0, inProgress: 0, resolved: 0 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [nextStatus, setNextStatus] = useState('raised');
  const [adminNote, setAdminNote] = useState('');

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const payload = await listAdminComplaints({
        limit: 120,
        search: search.trim(),
        status: statusFilter,
      });
      const nextComplaints = Array.isArray(payload?.complaints) ? payload.complaints : [];
      setComplaints(nextComplaints);
      setMetrics(payload?.metrics || { raised: 0, inProgress: 0, resolved: 0 });

      if (nextComplaints.length > 0) {
        setSelectedId((current) => current || nextComplaints[0].complaintId);
      }
    } catch (loadError) {
      setError(loadError.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    void loadComplaints();
  }, [loadComplaints, user?.role]);

  const selectedComplaint = useMemo(
    () => complaints.find((entry) => entry.complaintId === selectedId) || null,
    [complaints, selectedId]
  );

  useEffect(() => {
    if (!selectedComplaint) return;
    setNextStatus(selectedComplaint.status || 'raised');
    setAdminNote('');
  }, [selectedComplaint]);

  const updateStatus = async () => {
    if (!selectedComplaint?.complaintId) return;

    setUpdating(true);
    setError('');
    setNotice('');

    try {
      const updated = await updateComplaintStatus(
        selectedComplaint.complaintId,
        nextStatus,
        adminNote,
        user?.id || 'admin'
      );

      if (updated) {
        setComplaints((current) =>
          current.map((entry) => (entry.complaintId === updated.complaintId ? updated : entry))
        );
      }

      setNotice(`Ticket ${selectedComplaint.complaintId} updated to ${toStatusLabel(nextStatus)}.`);
      await loadComplaints();
    } catch (updateError) {
      setError(updateError.message || 'Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="admin-complaints">
      <div className="admin-complaints__header container">
        <div>
          <p className="admin-complaints__eyebrow">Admin Notifications</p>
          <h1>Complaint Center</h1>
          <p>Review tickets, open each complaint, and move progress from raised to resolved.</p>
        </div>
        <div className="admin-complaints__header-actions">
          <Link to="/admin/dashboard" className="admin-complaints__back-link">
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <button type="button" onClick={loadComplaints} disabled={loading || updating}>
            {(loading || updating) ? <LoaderCircle size={15} className="admin-spin" /> : <BellRing size={15} />} Refresh
          </button>
        </div>
      </div>

      <div className="container admin-complaints__content">
        {error ? <div className="admin-complaints__alert admin-complaints__alert--error">{error}</div> : null}
        {notice ? <div className="admin-complaints__alert admin-complaints__alert--ok">{notice}</div> : null}

        <section className="admin-complaints__metrics">
          <article>
            <p>Raised</p>
            <h3>{metrics.raised || 0}</h3>
          </article>
          <article>
            <p>In Progress</p>
            <h3>{metrics.inProgress || 0}</h3>
          </article>
          <article>
            <p>Resolved</p>
            <h3>{metrics.resolved || 0}</h3>
          </article>
        </section>

        <section className="admin-complaints__filters">
          <label>
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by user, ticket id, or complaint"
            />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{toStatusLabel(status)}</option>
            ))}
          </select>
          <button type="button" onClick={loadComplaints} disabled={loading || updating}>Apply</button>
        </section>

        <div className="admin-complaints__grid">
          <article className="admin-complaints__list">
            {loading ? <p className="admin-complaints__empty">Loading complaints...</p> : null}
            {!loading && complaints.length === 0 ? <p className="admin-complaints__empty">No complaints found.</p> : null}
            {complaints.map((entry) => (
              <button
                key={entry.complaintId}
                type="button"
                className={`admin-complaints__list-item ${selectedId === entry.complaintId ? 'is-active' : ''}`}
                onClick={() => setSelectedId(entry.complaintId)}
              >
                <div>
                  <strong>{entry.complaintId}</strong>
                  <p>{entry.name} ({entry.email})</p>
                  <small>{formatDate(entry.createdAt)}</small>
                </div>
                <span className={statusClass(entry.status)}>{toStatusLabel(entry.status)}</span>
              </button>
            ))}
          </article>

          <article className="admin-complaints__detail">
            {!selectedComplaint ? <p className="admin-complaints__empty">Select a complaint to manage ticket progress.</p> : null}
            {selectedComplaint ? (
              <>
                <header className="admin-complaints__detail-head">
                  <div>
                    <p>{selectedComplaint.name} ({selectedComplaint.email})</p>
                    <h3>{selectedComplaint.complaintId}</h3>
                  </div>
                  <span className={statusClass(selectedComplaint.status)}>{toStatusLabel(selectedComplaint.status)}</span>
                </header>

                <p className="admin-complaints__message">{selectedComplaint.message}</p>

                <div className="admin-complaints__manage-box">
                  <div className="admin-complaints__manage-head">
                    <ShieldAlert size={16} />
                    <h4>Update Ticket Progress</h4>
                  </div>

                  <div className="admin-complaints__manage-fields">
                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{toStatusLabel(status)}</option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      placeholder="Optional note shown to the user"
                      value={adminNote}
                      onChange={(event) => setAdminNote(event.target.value)}
                    />
                    <button type="button" onClick={updateStatus} disabled={updating}>
                      {updating ? 'Updating...' : 'Save Progress'}
                    </button>
                  </div>
                </div>

                <section className="admin-complaints__history">
                  <h4>Ticket Timeline</h4>
                  {(selectedComplaint.history || []).map((entry, index) => (
                    <article key={`${selectedComplaint.complaintId}-${index}`}>
                      <p>
                        <strong>{toStatusLabel(entry.status)}</strong> - {entry.note || 'Status updated'}
                      </p>
                      <small>{formatDate(entry.createdAt)}</small>
                    </article>
                  ))}
                </section>
              </>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
