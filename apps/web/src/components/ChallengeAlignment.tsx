'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Check } from 'lucide-react';

// §14 — Problem Statement Alignment Matrix (reused verbatim from the master
// build document). This is the single source of truth for the "Challenge
// Alignment" reveal that closes the §16 demo narrative (step 6).
//
// Rendered as a modal reachable from both the fan home and the ops dashboard,
// so judges can see exactly which rubric criteria the live demo exercised.

export interface AlignmentRow {
  feature: string;
  challenge: string;
  targetUser: string;
  genaiUsage: string;
  operationalValue: string;
  judgingImpact: string;
}

export const ALIGNMENT_MATRIX: AlignmentRow[] = [
  {
    feature: 'Conversational Wayfinding',
    challenge: 'Navigation, Multilingual Assistance',
    targetUser: 'Fans',
    genaiUsage: 'Full generative concierge, function-calling',
    operationalValue: 'Reduces staff burden of directions requests',
    judgingImpact: 'Problem Alignment, Accessibility',
  },
  {
    feature: 'Live Congestion-Aware Rerouting',
    challenge: 'Navigation, Crowd Management',
    targetUser: 'Fans',
    genaiUsage: 'Route re-scoring against live signal',
    operationalValue: 'Reduces bottleneck severity in real time',
    judgingImpact: 'Problem Alignment, Efficiency',
  },
  {
    feature: 'Incident Intelligence Feed',
    challenge: 'Operational Intelligence, Real-Time Decision Support',
    targetUser: 'Staff, Organizers',
    genaiUsage: 'Summarization, deduplication',
    operationalValue: 'Faster, more accurate situational awareness',
    judgingImpact: 'Problem Alignment, Efficiency',
  },
  {
    feature: 'Dispatch Advisor',
    challenge: 'Real-Time Decision Support, Operational Intelligence',
    targetUser: 'Staff, Organizers',
    genaiUsage: 'Suggestion generation (human-approved)',
    operationalValue: 'Faster response without removing human judgment',
    judgingImpact: 'Problem Alignment, Security',
  },
  {
    feature: 'Volunteer One-Tap Reporting',
    challenge: 'Operational Intelligence',
    targetUser: 'Volunteers',
    genaiUsage: 'Classification/tagging',
    operationalValue: 'Turns informal observation into structured signal',
    judgingImpact: 'Problem Alignment',
  },
  {
    feature: 'Post-Match Transit/Egress Planner',
    challenge: 'Transportation, Sustainability',
    targetUser: 'Fans',
    genaiUsage: 'Ranks options against live + transit data',
    operationalValue: 'Reduces exit-congestion severity, nudges toward transit',
    judgingImpact: 'Problem Alignment',
  },
  {
    feature: 'Multilingual Conversational Concierge',
    challenge: 'Multilingual Assistance, Accessibility',
    targetUser: 'Fans',
    genaiUsage: 'Auto-detected multilingual generation',
    operationalValue: 'Removes language as an access barrier',
    judgingImpact: 'Problem Alignment, Accessibility',
  },
  {
    feature: 'Accessibility Simplifier',
    challenge: 'Accessibility',
    targetUser: 'Fans',
    genaiUsage: 'Constrained rewrite',
    operationalValue: 'Reduces cognitive load, supports non-native readers',
    judgingImpact: 'Accessibility',
  },
  {
    feature: 'Mobility-Accessible Routing Mode',
    challenge: 'Accessibility, Navigation',
    targetUser: 'Fans',
    genaiUsage: 'Constrained pathfinding over AI-agnostic graph',
    operationalValue: 'Genuine independence for mobility-impaired fans',
    judgingImpact: 'Accessibility',
  },
  {
    feature: 'Role-Based Ops Console',
    challenge: 'Operational Intelligence',
    targetUser: 'Staff, Volunteers, Organizers',
    genaiUsage: 'None (deterministic RBAC)',
    operationalValue: 'Right information to the right role, nothing more',
    judgingImpact: 'Security',
  },
  {
    feature: 'Live Congestion Heatmap',
    challenge: 'Crowd Management, Operational Intelligence',
    targetUser: 'Staff, Organizers, Fans',
    genaiUsage: 'Visualization of live signal',
    operationalValue: 'Spatial situational awareness',
    judgingImpact: 'Problem Alignment',
  },
];

interface ChallengeAlignmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChallengeAlignmentModal({ open, onClose }: ChallengeAlignmentModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-alignment-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 'min(900px, 96vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 id="challenge-alignment-title" className="display-title" style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
            Challenge Alignment Matrix
          </h2>
          <button
            onClick={onClose}
            aria-label="Close challenge alignment"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px 0' }}>
          §14 — every feature demonstrated in the live matchday scenario maps to a specific challenge requirement the judges score. This is the close of the §16 demo narrative.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '720px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--primary-accent)' }}>
                <th style={{ padding: '8px 6px' }}>Feature</th>
                <th style={{ padding: '8px 6px' }}>Challenge Requirement(s)</th>
                <th style={{ padding: '8px 6px' }}>Target User</th>
                <th style={{ padding: '8px 6px' }}>GenAI Usage</th>
                <th style={{ padding: '8px 6px' }}>Operational Value</th>
                <th style={{ padding: '8px 6px' }}>Judging Impact</th>
              </tr>
            </thead>
            <tbody>
              {ALIGNMENT_MATRIX.map((row) => (
                <tr key={row.feature} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 'bold', fontFamily: "'Space Grotesk', sans-serif" }}>{row.feature}</td>
                  <td style={{ padding: '8px 6px' }}>{row.challenge}</td>
                  <td style={{ padding: '8px 6px' }}>{row.targetUser}</td>
                  <td style={{ padding: '8px 6px' }}>{row.genaiUsage}</td>
                  <td style={{ padding: '8px 6px' }}>{row.operationalValue}</td>
                  <td style={{ padding: '8px 6px' }}>{row.judgingImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          color: 'var(--secondary-accent)',
          fontSize: '13px',
        }}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>One engine, two views: the same live congestion + incident signal powers both the fan and ops surfaces — access controlled by real server-side RBAC.</span>
        </div>
      </div>
    </div>
  );
}

interface ChallengeAlignmentFooterProps {
  onOpen: () => void;
}

export function ChallengeAlignmentFooter({ onOpen }: ChallengeAlignmentFooterProps) {
  return (
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <button
        onClick={onOpen}
        aria-label="Open Challenge Alignment matrix"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--primary-accent)',
          fontWeight: 'bold',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'background-color 200ms ease',
        }}
      >
        <Check size={14} aria-hidden="true" />
        <span>Challenge Alignment</span>
      </button>
    </div>
  );
}
