import React, { LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = "", children, ...props }: LabelProps) {
  return (
    <label className={`text-sm font-medium text-brand-dark ${className}`} {...props}>
      {children}
    </label>
  );
}
