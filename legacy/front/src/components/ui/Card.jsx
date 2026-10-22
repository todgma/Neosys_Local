import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  onClick,
  ...rest
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const baseClasses = 'bg-white rounded-lg border border-gray-200';
  const classes = `${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${className}`;

  return (
    <div className={classes} onClick={onClick} {...rest}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 pb-3 mb-4 ${className}`}>
      {children}
    </div>
  );
};

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`border-t border-gray-200 pt-3 mt-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;