import React from 'react';

// ----------------------------------------------------
// 1. Clean Inline SVG Outline Icons (Lucide-Style, 1.75px stroke)
// ----------------------------------------------------

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const AlertTriangle: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const AlertCircle: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CheckCircle: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const Info: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ----------------------------------------------------
// 2. SeverityBadge Component
// ----------------------------------------------------
export interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  let badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    borderWidth: '1px',
    borderStyle: 'solid',
    // §9: solid backgrounds + white text guarantee WCAG 2 AA contrast (≥4.5:1)
    // even when the badge sits over a translucent/dark surface.
    color: '#ffffff',
  };

  let icon: React.ReactNode;
  let labelText: string = severity;

  if (severity === 'high') {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: '#b91c1c',
      borderColor: '#ef4444',
    };
    icon = <AlertTriangle size={14} />;
    labelText = 'HIGH ALERT';
  } else if (severity === 'medium') {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: '#b45309',
      borderColor: '#fbbf24',
    };
    icon = <AlertCircle size={14} />;
    labelText = 'WARNING';
  } else {
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: '#047857',
      borderColor: '#10b981',
    };
    icon = <CheckCircle size={14} />;
    labelText = 'STABLE';
  }

  return (
    <span style={badgeStyle} className="severity-badge">
      {icon}
      <span>{labelText}</span>
    </span>
  );
};

// ----------------------------------------------------
// 3. RouteCard Component
// ----------------------------------------------------
export interface RouteCardProps {
  destinationName: string;
  totalTimeSeconds: number;
  isAccessible: boolean;
  pathNodesCount: number;
  congestionLevel?: 'low' | 'medium' | 'high';
}

export const RouteCard: React.FC<RouteCardProps> = ({
  destinationName,
  totalTimeSeconds,
  isAccessible,
  pathNodesCount,
  congestionLevel = 'low',
}) => {
  const mins = Math.ceil(totalTimeSeconds / 60);

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(251, 191, 36, 0.15)',
    backdropFilter: 'blur(12px)',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    marginTop: '16px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  };

  let densityColor = '#10b981';
  let densityBg = 'rgba(16, 185, 129, 0.1)';
  let densityBorder = '#10b981';
  let densityIcon = <CheckCircle size={12} />;

  if (congestionLevel === 'high') {
    densityColor = '#ef4444';
    densityBg = 'rgba(239, 68, 68, 0.1)';
    densityBorder = '#ef4444';
    densityIcon = <AlertTriangle size={12} />;
  } else if (congestionLevel === 'medium') {
    densityColor = '#fbbf24';
    densityBg = 'rgba(245, 158, 11, 0.1)';
    densityBorder = '#fbbf24';
    densityIcon = <AlertCircle size={12} />;
  }

  const badgeStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: 'bold',
    backgroundColor: densityBg,
    color: densityColor,
    border: `1px solid ${densityBorder}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <div style={cardStyle} className="route-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {destinationName}
        </h4>
        <span style={badgeStyle}>
          {densityIcon}
          <span>{congestionLevel.toUpperCase()} DENSITY</span>
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          fontSize: '15px',
          lineHeight: 1.5,
        }}
      >
        <div>
          <span
            style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}
          >
            EST. TIME
          </span>
          <span
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              color: '#fbbf24',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {mins} min
          </span>
        </div>
        <div>
          <span
            style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}
          >
            STOPS
          </span>
          <span
            style={{ fontWeight: 'bold', fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}
          >
            {pathNodesCount} zones
          </span>
        </div>
        <div>
          <span
            style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}
          >
            WAY MODE
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
            {isAccessible ? '♿ Accessible' : '🚶 Standard'}
          </span>
        </div>
      </div>
    </div>
  );
};
