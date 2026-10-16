import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

/**
 * Modern Custom Select Dropdown
 * 
 * Props:
 * - value: string (current selected value)
 * - onChange: (value: string) => void
 * - options: Array<{ value: string, label: string, icon?: React.ReactNode, dotColor?: string, badge?: string } | string>
 * - placeholder?: string
 * - icon?: React.ReactNode (leading icon on the trigger)
 * - variant?: 'filter' | 'form'
 * - error?: boolean | string
 * - disabled?: boolean
 * - id?: string
 * - className?: string
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  icon,
  variant = 'filter',
  error,
  disabled = false,
  id,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Normalize options to objects: { value, label, icon, dotColor, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const isFormVariant = variant === 'form';
  const hasError = Boolean(error);
  const isSelected = Boolean(selectedOption && selectedOption.value !== '');

  return (
    <div
      ref={containerRef}
      id={id}
      className={`c-select-container c-select-${variant} ${isOpen ? 'is-open' : ''} ${hasError ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      {/* Hidden input for HTML form accessibility/autocomplete compatibility */}
      <input type="hidden" value={value || ''} />

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        className="c-select-trigger"
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="c-select-trigger-left">
          {/* Priority: selected option's dotColor or leading icon */}
          {selectedOption?.dotColor ? (
            <span
              className="c-select-dot"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          ) : (
            (selectedOption?.icon || icon) && (
              <span className="c-select-icon">
                {selectedOption?.icon || icon}
              </span>
            )
          )}

          <span
            className={`c-select-value ${!isSelected ? 'is-placeholder' : ''}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={isFormVariant ? 15 : 14}
          className={`c-select-chevron ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div ref={menuRef} className="c-select-menu" role="listbox">
          <div className="c-select-menu-inner">
            {normalizedOptions.map((opt) => {
              const isItemActive = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isItemActive}
                  className={`c-select-item ${isItemActive ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="c-select-item-content">
                    {opt.dotColor ? (
                      <span
                        className="c-select-dot"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                    ) : (
                      opt.icon && (
                        <span className="c-select-item-icon">{opt.icon}</span>
                      )
                    )}

                    <span className="c-select-item-label">{opt.label}</span>

                    {opt.badge && (
                      <span className="c-select-item-badge">{opt.badge}</span>
                    )}
                  </div>

                  {isItemActive && (
                    <Check size={14} className="c-select-check" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
