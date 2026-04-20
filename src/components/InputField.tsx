import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { FieldError } from 'react-hook-form';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon, rightElement, className = '', ...props }, ref) => {
    const fallbackId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const inputId = props.id ?? props.name ?? fallbackId;
    const inputName = props.name ?? inputId;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium tracking-widest uppercase text-slate-300 font-body"
        >
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors duration-200">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            name={inputName}
            className={`
              w-full bg-slate-900/60 border border-slate-700/60
              rounded-xl px-4 py-3 font-body text-base text-slate-100
              placeholder:text-slate-600
              focus:outline-none focus:border-brand-500 focus:bg-slate-900
              focus:ring-1 focus:ring-brand-500/30
              transition-all duration-200
              ${icon ? 'pl-10' : ''}
              ${rightElement ? 'pr-12' : ''}
              ${error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {rightElement}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 font-body mt-0.5 animate-fade-in">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
