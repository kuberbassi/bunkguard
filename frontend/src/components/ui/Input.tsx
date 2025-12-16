import React, { type InputHTMLAttributes } from 'react';


interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}
            <input
                className={`input w-full px-4 py-2.5 bg-dark-800 border ${error ? 'border-danger-500' : 'border-dark-700'
                    } rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-danger-400">{error}</p>}
        </div>
    );
};

export default Input;
