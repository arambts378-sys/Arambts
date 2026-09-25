import React, { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className = "", label, error, id, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col space-y-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-brand-dark">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-brand-white border text-brand-dark ${
          error ? "border-red-500 focus:ring-red-500" : "border-brand-border focus:ring-brand-maroon"
        } rounded-sm shadow-sm placeholder-brand-muted/50 focus:outline-none focus:ring-1 sm:text-sm transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
