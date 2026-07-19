'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { db } from '@/lib/db';
import { Report } from '@matchflow/types';
import {
  Send,
  FileText,
  Users,
  HeartHandshake,
  ShieldAlert,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { AlertCircle, AlertTriangle, CheckCircle } from '@matchflow/ui';

export default function VolunteerPage() {
  const { session, simulateOffline } = useSession();
  const [category, setCategory] = useState('crowd');
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const descriptionId = 'volunteer-report-description';
  const categoryGroupId = 'volunteer-category-group';
  const statusId = 'volunteer-status-msg';

  // Subscribe to this volunteer's reports
  useEffect(() => {
    if (simulateOffline) {
      setError('Connection offline. Cannot sync volunteer feed.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);

    const unsubscribe = db.subscribeToReports(
      session.role,
      session.userId,
      (myReports) => {
        setReports(myReports);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [session.role, session.userId, simulateOffline]);

  const categories = [
    { id: 'crowd', label: 'Congestion', icon: <Users size={14} aria-hidden="true" /> },
    { id: 'medical', label: 'Medical', icon: <HeartHandshake size={14} aria-hidden="true" /> },
    { id: 'security', label: 'Security', icon: <ShieldAlert size={14} aria-hidden="true" /> },
    { id: 'facility', label: 'Facility / Lift', icon: <Settings size={14} aria-hidden="true" /> },
    { id: 'other', label: 'Other', icon: <HelpCircle size={14} aria-hidden="true" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (simulateOffline) {
      setError('Failed to submit report. Operational network offline.');
      return;
    }

    try {
      await db.createReport(session.role, {
        authorId: session.userId,
        authorName: 'Diego (Volunteer)',
        authorRole: session.role,
        category,
        description,
        zoneId: 'Zone_A',
        level: '100',
      });
      setSuccess(true);
      setDescription('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report.');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* §9: h1 page heading */}
      <h1
        className="display-title"
        style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}
      >
        Volunteer Command Center
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        Low-friction, rapid concourse reporting channel.
      </p>

      {/* §9: role=status for success/error — live region outside the form */}
      <div id={statusId} aria-live="assertive" aria-atomic="true">
        {error && (
          <div
            role="alert"
            className="glass-panel"
            style={{
              backgroundColor: '#7f1d1d',
              color: '#ffffff',
              border: '1px solid var(--alert-accent)',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="glass-panel"
            style={{
              backgroundColor: '#065f46',
              color: '#ffffff',
              border: '1px solid var(--secondary-accent)',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={16} aria-hidden="true" />
            <span>Report successfully submitted to Incident Intelligence Feed!</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel"
        aria-label="File a new concourse report"
        style={{ padding: '24px', marginBottom: '32px' }}
      >
        {/* §9: h2 inside labelled form section */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          File New Concourse Report
        </h2>

        {/* §9: Category group — role=group with aria-labelledby */}
        <div role="group" aria-labelledby={categoryGroupId} style={{ marginBottom: '20px' }}>
          <div
            id={categoryGroupId}
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
            aria-hidden="true"
          >
            CATEGORY
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                aria-pressed={category === cat.id}
                aria-label={`Report category: ${cat.label}${category === cat.id ? ' (selected)' : ''}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border:
                    category === cat.id
                      ? '2px solid var(--primary-accent)'
                      : '1px solid var(--border-color)',
                  backgroundColor:
                    category === cat.id ? 'var(--primary-accent)' : 'var(--bg-surface-elevated)',
                  color: category === cat.id ? '#000000' : 'var(--text-primary)',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 200ms ease, color 200ms ease',
                }}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* §9: textarea with explicit label via htmlFor */}
        <label
          htmlFor={descriptionId}
          style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            fontWeight: 'bold',
          }}
        >
          DESCRIPTION / DETAIL
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you see (e.g. lift is stuck, crowd is piling up at concession)..."
          required
          aria-describedby={statusId}
          style={{
            width: '100%',
            height: '100px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            marginBottom: '20px',
            resize: 'vertical',
          }}
        />

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '6px',
            backgroundColor: 'var(--primary-accent)',
            color: '#000000',
            fontWeight: 'bold',
            border: 'none',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.3)',
            transition: 'transform 150ms ease',
          }}
        >
          <Send size={16} aria-hidden="true" />
          <span>Escalate Report</span>
        </button>
      </form>

      {/* §9: h2 history section heading */}
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <FileText size={20} color="var(--primary-accent)" aria-hidden="true" />
        <span>My Submitted Reports ({reports.length})</span>
      </h2>

      {loading ? (
        <p role="status" aria-live="polite" style={{ color: 'var(--text-secondary)' }}>
          Loading history log...
        </p>
      ) : reports.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            textAlign: 'center',
            borderStyle: 'dashed',
            color: 'var(--text-secondary)',
          }}
          role="status"
        >
          No reports filed in this session.
        </div>
      ) : (
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {reports.map((rep) => (
            <li key={rep.id} className="glass-panel" style={{ padding: '16px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: 'var(--primary-accent)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {rep.category.toUpperCase()}
                </span>
                {/* §9: time element for screen readers */}
                <time
                  dateTime={new Date(rep.timestamp).toISOString()}
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {new Date(rep.timestamp).toLocaleTimeString()}
                </time>
              </div>
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                }}
              >
                {rep.description}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>
                Location: {rep.zoneId} · Level {rep.level}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
