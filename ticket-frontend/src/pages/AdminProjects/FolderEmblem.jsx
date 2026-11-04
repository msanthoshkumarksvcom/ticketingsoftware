import React from 'react';
import { FolderKanban } from 'lucide-react';

/**
 * Modern Project Emblem
 * Clean, professional SaaS project emblem adhering to the Blue & Dark Navy design system.
 */
export default function FolderEmblem({ label = '', code = '' }) {
  // Compute clean 2-letter initials
  const initials = React.useMemo(() => {
    if (code) {
      const cleanCode = code.replace(/^PRJ-?/i, '');
      if (cleanCode.length >= 2) return cleanCode.slice(0, 2).toUpperCase();
    }
    if (label) {
      const parts = label.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return label.slice(0, 2).toUpperCase();
    }
    return '';
  }, [label, code]);

  return (
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '11px',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1.5px solid #BFDBFE',
        color: '#1E3A8A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '13px',
        letterSpacing: '0.04em',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)',
        userSelect: 'none'
      }}
      aria-hidden="true"
    >
      {initials ? initials : <FolderKanban size={18} color="#2563EB" />}
    </div>
  );
}

export { FolderEmblem };
