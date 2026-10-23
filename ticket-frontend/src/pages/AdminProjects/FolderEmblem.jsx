import React from 'react';
import {
  Settings,
  ShoppingCart,
  GraduationCap,
  Building2,
  Shield,
  Check,
  Folder
} from 'lucide-react';

const FOLDER_THEMES = {
  blue: {
    back: '#3b82f6',
    front: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 55%, #1d4ed8 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.28)',
    badgeBorder: 'rgba(255, 255, 255, 0.45)',
    textColor: '#ffffff',
    iconColor: '#ffffff'
  },
  purple: {
    back: '#8b5cf6',
    front: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 55%, #6d28d9 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.28)',
    badgeBorder: 'rgba(255, 255, 255, 0.45)',
    textColor: '#ffffff',
    iconColor: '#ffffff'
  },
  amber: {
    back: '#f59e0b',
    front: 'linear-gradient(135deg, #fde047 0%, #f59e0b 55%, #d97706 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.35)',
    badgeBorder: 'rgba(255, 255, 255, 0.55)',
    textColor: '#78350f',
    iconColor: '#78350f'
  },
  pink: {
    back: '#f43f5e',
    front: 'linear-gradient(135deg, #fda4af 0%, #f43f5e 55%, #e11d48 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.32)',
    badgeBorder: 'rgba(255, 255, 255, 0.5)',
    textColor: '#881337',
    iconColor: '#881337'
  },
  teal: {
    back: '#14b8a6',
    front: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 55%, #0d9488 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.32)',
    badgeBorder: 'rgba(255, 255, 255, 0.5)',
    textColor: '#134e4a',
    iconColor: '#134e4a'
  },
  violet: {
    back: '#a78bfa',
    front: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 55%, #7c3aed 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.35)',
    badgeBorder: 'rgba(255, 255, 255, 0.55)',
    textColor: '#4c1d95',
    iconColor: '#4c1d95'
  },
  emerald: {
    back: '#10b981',
    front: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 55%, #059669 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.32)',
    badgeBorder: 'rgba(255, 255, 255, 0.5)',
    textColor: '#064e3b',
    iconColor: '#064e3b'
  }
};

export function FolderEmblem({ color = 'blue', icon = 'folder', label = '' }) {
  const theme = FOLDER_THEMES[color] || FOLDER_THEMES.blue;

  const renderBadgeContent = () => {
    const iconKey = (icon || '').toLowerCase();
    if (iconKey === 'cs') {
      return (
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '15px',
            letterSpacing: '-0.5px',
            color: '#ffffff'
          }}
        >
          CS
        </span>
      );
    }
    if (iconKey === 'api') {
      return (
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0px',
            color: '#ffffff'
          }}
        >
          API
        </span>
      );
    }
    if (iconKey === 'settings' || iconKey === 'gear') {
      return <Settings size={18} strokeWidth={2.4} color={theme.iconColor} />;
    }
    if (iconKey === 'cart' || iconKey === 'shopping-cart') {
      return <ShoppingCart size={18} strokeWidth={2.4} color={theme.iconColor} />;
    }
    if (iconKey === 'graduation' || iconKey === 'academic') {
      return <GraduationCap size={20} strokeWidth={2.4} color={theme.iconColor} />;
    }
    if (iconKey === 'building' || iconKey === 'office') {
      return <Building2 size={18} strokeWidth={2.4} color={theme.iconColor} />;
    }
    if (iconKey === 'shield') {
      return <Shield size={18} strokeWidth={2.4} color={theme.iconColor} />;
    }
    if (iconKey === 'check') {
      return <Check size={18} strokeWidth={2.5} color={theme.iconColor} />;
    }

    // Default: initials or fallback folder icon
    if (label && label.length > 0) {
      const parts = label.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : label.slice(0, 2).toUpperCase();
      return (
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '14px',
            color: theme.textColor
          }}
        >
          {initials}
        </span>
      );
    }

    return <Folder size={18} color={theme.iconColor} />;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '64px',
        height: '52px',
        flexShrink: 0,
        userSelect: 'none'
      }}
      aria-hidden="true"
    >
      {/* Folder Back Tab */}
      <div
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '28px',
          height: '14px',
          backgroundColor: theme.back,
          borderTopLeftRadius: '7px',
          borderTopRightRadius: '7px',
          opacity: 0.9
        }}
      />
      {/* Folder Tab slope transition */}
      <div
        style={{
          position: 'absolute',
          top: '0px',
          left: '26px',
          width: '14px',
          height: '14px',
          backgroundColor: theme.back,
          borderTopRightRadius: '8px',
          transform: 'skewX(25deg)',
          opacity: 0.85
        }}
      />
      {/* Folder Body Front */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '0px',
          width: '64px',
          height: '44px',
          background: theme.front,
          borderRadius: '10px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Emblem Badge on Front */}
        <div
          style={{
            minWidth: '28px',
            height: '28px',
            padding: '0 5px',
            borderRadius: icon?.toLowerCase() === 'api' ? '7px' : '9999px',
            backgroundColor: theme.badgeBg,
            border: `1.5px solid ${theme.badgeBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {renderBadgeContent()}
        </div>
      </div>
    </div>
  );
}

export default FolderEmblem;
