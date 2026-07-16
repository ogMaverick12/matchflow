'use client';

import React from 'react';
import { useSession } from '@/context/SessionContext';
import { Eye, Info, Activity, MessageSquare } from 'lucide-react';

export default function AccessibilityHubPage() {
  const { session, setAccessibilityMode } = useSession();

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* §9: Heading hierarchy — h1 as page root */}
      <h1 className="display-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
        Accessibility Support Hub
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 24px 0' }}>
        Configure features to reduce physical barriers and cognitive load.
      </p>

      {/* §9: fieldset + legend gives each group a labelled region */}
      <fieldset
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          border: '1px solid var(--border-color)',
          borderRadius: '8px'
        }}>
        <legend style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          padding: '0 4px',
          textTransform: 'uppercase'
        }}>
          Accessibility Preferences
        </legend>

        {/* Toggle 1: Mobility Routing */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            {/* §9: h2 within the page section, not h4 */}
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
              {/* §9: Decorative icon — aria-hidden */}
              <Activity size={18} color="var(--primary-accent)" aria-hidden="true" />
              <span>Mobility-Accessible Routing</span>
            </h2>
            <p id="mobility-routing-desc" style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Avoids all stairs and escalators. Forces concourse routing to elevators and ramps.
            </p>
          </div>
          {/* §9: label wraps input — proper association */}
          <label
            htmlFor="toggle-mobility"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
            <span className="sr-only">Enable Mobility-Accessible Routing</span>
            <input
              id="toggle-mobility"
              type="checkbox"
              role="switch"
              aria-checked={session.accessibilityMode.mobilityRouting}
              aria-describedby="mobility-routing-desc"
              checked={session.accessibilityMode.mobilityRouting}
              onChange={(e) => setAccessibilityMode({ mobilityRouting: e.target.checked })}
              style={{
                width: '40px',
                height: '24px',
                cursor: 'pointer',
                accentColor: 'var(--primary-accent)',
                flexShrink: 0
              }}
            />
          </label>
        </div>

        {/* Toggle 2: High Contrast */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
              <Eye size={18} color="var(--primary-accent)" aria-hidden="true" />
              <span>High-Contrast / Low-Stimulation Theme</span>
            </h2>
            <p id="high-contrast-desc" style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Switches to stark black/white/yellow palette, disables all decorative animations, and simplifies visual hierarchy for low-light, sunlight, or neurodivergent/migraine-sensitive use.
            </p>
          </div>
          <label
            htmlFor="toggle-contrast"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
            <span className="sr-only">Enable High-Contrast / Low-Stimulation Theme</span>
            <input
              id="toggle-contrast"
              type="checkbox"
              role="switch"
              aria-checked={session.accessibilityMode.highContrast}
              aria-describedby="high-contrast-desc"
              checked={session.accessibilityMode.highContrast}
              onChange={(e) => setAccessibilityMode({ highContrast: e.target.checked })}
              style={{
                width: '40px',
                height: '24px',
                cursor: 'pointer',
                accentColor: 'var(--primary-accent)',
                flexShrink: 0
              }}
            />
          </label>
        </div>

        {/* Toggle 3: Simplified Language */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
              <MessageSquare size={18} color="var(--primary-accent)" aria-hidden="true" />
              <span>Simplified Language</span>
            </h2>
            <p id="simplified-lang-desc" style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Replaces dense wayfinding summaries with short, direct sentences to reduce cognitive load.
            </p>
          </div>
          <label
            htmlFor="toggle-simplified"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}>
            <span className="sr-only">Enable Simplified Language</span>
            <input
              id="toggle-simplified"
              type="checkbox"
              role="switch"
              aria-checked={session.accessibilityMode.simplifiedLanguage}
              aria-describedby="simplified-lang-desc"
              checked={session.accessibilityMode.simplifiedLanguage}
              onChange={(e) => setAccessibilityMode({ simplifiedLanguage: e.target.checked })}
              style={{
                width: '40px',
                height: '24px',
                cursor: 'pointer',
                accentColor: 'var(--primary-accent)',
                flexShrink: 0
              }}
            />
          </label>
        </div>
      </fieldset>

      <div className="glass-panel" style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fontSize: '13px',
        color: 'var(--primary-accent)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }} role="note">
        {/* §9: Decorative icon — aria-hidden */}
        <Info size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
        <span>
          These preferences are saved locally and will apply instantly to all conversational wayfinding guides and maps.
        </span>
      </div>
    </div>
  );
}
