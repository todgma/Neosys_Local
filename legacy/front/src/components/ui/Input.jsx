import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  iconPosition = 'left',
  helperText,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseInputClasses = 'block w-full rounded-md border-gray-300 shadow-sm transition-colors duration-200 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500';
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : '';
  const iconClasses = Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '';

  const inputClasses = `${baseInputClasses} ${errorClasses} ${iconClasses} ${className}`;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;