import React, { type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
    options: { value: string | number; label: string }[];
}

const Select: React.FC<SelectProps> = ({
    label,
    error,
    helperText,
    fullWidth = true,
    options,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <div className={`${fullWidth ? 'w-full' : 'w-auto'} flex flex-col gap-1.5`}>
            {label && (
                <label className="text-sm font-medium text-on-surface-variant ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    className={`
                        w-full px-4 py-3 rounded-xl appearance-none
                        bg-surface-container-high/50
                        border transition-all duration-200
                        text-on-surface
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-4 focus:ring-primary/10
                        cursor-pointer
                        ${error
                            ? 'border-error focus:border-error'
                            : 'border-outline-variant/50 focus:border-primary hover:border-outline-variant'
                        }
                        ${className}
                    `}
                    disabled={disabled}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    <ChevronDown size={18} />
                </div>
            </div>
            {(error || helperText) && (
                <p className={`text-xs ml-1 ${error ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Select;
