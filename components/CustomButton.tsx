import React from 'react';
import styles from '../styles/CustomButton.module.css';

export interface CustomButtonProps {
  onClick?:
    ((event: React.MouseEvent<HTMLButtonElement>) => void) | (() => void);
  children: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  shouldIgnoreClicks?: boolean;
  svg?: string | null;
}

export default function CustomButton({
  onClick,
  children,
  isActive = false,
  isDisabled = false,
  className,
  fullWidth = false,
  type = 'button',
  shouldIgnoreClicks = false,
}: CustomButtonProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
    if (shouldIgnoreClicks || isDisabled) {
      if (type === 'submit') {
        event.preventDefault();
      }
      return;
    }

    if (!onClick) {
      return;
    }

    if (onClick.length === 0) {
      (onClick as () => void)();
    } else {
      (onClick as (clickEvent: React.MouseEvent<HTMLButtonElement>) => void)(
        event
      );
    }
  }

  const buttonClasses = buildButtonClasses(
    isActive,
    isDisabled,
    fullWidth,
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {children}
    </button>
  );
}

function buildButtonClasses(
  isActive: boolean,
  isDisabled: boolean,
  fullWidth: boolean,
  className?: string
): string {
  return [
    styles.customButton,
    isActive ? styles.active : '',
    className || '',
    className && styles[className] ? styles[className] : '',
    fullWidth ? styles.fullWidth : '',
    isDisabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');
}
