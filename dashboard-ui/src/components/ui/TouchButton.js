import React from 'react';
import styled from 'styled-components';
import { useTouchInteractions, useRipple } from '../../hooks/useTouchInteractions';
import { ripple } from '../../styles/animations';
import ds from '../../styles/designSystem';

const ButtonContainer = styled.button`
  position: relative;
  overflow: hidden;
  
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${ds.spacing[2]};
  
  /* Touch-friendly sizing */
  min-height: ${ds.touch.minTargetSize};
  min-width: ${ds.touch.minTargetSize};
  padding: ${props => {
    switch (props.size) {
      case 'sm': return `${ds.spacing[2]} ${ds.spacing[4]}`;
      case 'lg': return `${ds.spacing[4]} ${ds.spacing[8]}`;
      default: return `${ds.spacing[3]} ${ds.spacing[6]}`;
    }
  }};
  
  /* Typography */
  font-family: ${ds.typography.fontFamily.sans};
  font-size: ${props => {
    switch (props.size) {
      case 'sm': return ds.typography.fontSize.sm;
      case 'lg': return ds.typography.fontSize.lg;
      default: return ds.typography.fontSize.base;
    }
  }};
  font-weight: ${ds.typography.fontWeight.medium};
  line-height: ${ds.typography.lineHeight.tight};
  
  /* Visual styling */
  background: ${props => {
    switch (props.variant) {
      case 'secondary':
        return ds.colors.glass;
      case 'ghost':
        return 'transparent';
      default:
        return `linear-gradient(135deg, ${ds.colors.sand[400]} 0%, ${ds.colors.sand[500]} 100%)`;
    }
  }};
  
  color: ${props => {
    switch (props.variant) {
      case 'secondary':
      case 'ghost':
        return ds.colors.stone[800];
      default:
        return 'white';
    }
  }};
  
  border: ${props => {
    switch (props.variant) {
      case 'secondary':
        return `1px solid ${ds.colors.glassBorder}`;
      case 'ghost':
        return '1px solid transparent';
      default:
        return 'none';
    }
  }};
  
  border-radius: ${props => props.rounded ? ds.borderRadius.full : ds.borderRadius.lg};
  
  box-shadow: ${props => {
    if (props.variant === 'ghost') return 'none';
    return props.isPressed ? ds.shadows.sm : ds.shadows.md;
  }};
  
  /* Transitions */
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  transform: ${props => props.isPressed ? `scale(${ds.touch.tapScale})` : 'scale(1)'};
  
  /* Backdrop filter for glass effect */
  ${props => props.variant === 'secondary' && `
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `}
  
  /* Remove default button styles */
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  
  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Icon styling */
  svg {
    width: 1.25em;
    height: 1.25em;
    flex-shrink: 0;
  }
`;

const RippleContainer = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const Ripple = styled.span`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.variant === 'primary' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.1)'};
  transform: translate(-50%, -50%);
  animation: ${ripple} 0.6s ease-out;
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * Touch-optimized button component with delightful interactions
 */
export const TouchButton = ({
  children,
  onClick,
  onLongPress,
  variant = 'primary', // primary, secondary, ghost
  size = 'md', // sm, md, lg
  rounded = false,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className,
  ...props
}) => {
  const { handlers, isPressed } = useTouchInteractions({
    onTap: onClick,
    onLongPress,
  });
  
  const { ripples, addRipple } = useRipple();
  
  const handleInteraction = (e) => {
    if (!disabled && !loading) {
      addRipple(e);
      handlers.onTouchStart(e);
    }
  };
  
  return (
    <ButtonContainer
      className={className}
      variant={variant}
      size={size}
      rounded={rounded}
      isPressed={isPressed}
      disabled={disabled || loading}
      {...handlers}
      onTouchStart={handleInteraction}
      onMouseDown={handleInteraction}
      {...props}
    >
      <RippleContainer>
        {ripples.map((ripple) => (
          <Ripple
            key={ripple.id}
            style={{ left: ripple.x, top: ripple.y }}
            variant={variant}
          />
        ))}
      </RippleContainer>
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </ButtonContainer>
  );
};

// Floating Action Button variant
const FABContainer = styled(ButtonContainer)`
  position: fixed;
  bottom: ${ds.spacing[8]};
  right: ${ds.spacing[8]};
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: ${ds.borderRadius.full};
  box-shadow: ${ds.shadows.lg};
  z-index: ${ds.zIndex.fixed};
  
  /* Enhance the gradient for FAB */
  background: linear-gradient(135deg, ${ds.colors.ocean[400]} 0%, ${ds.colors.ocean[500]} 100%);
  
  /* Add glow effect */
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: ${ds.borderRadius.full};
    background: linear-gradient(135deg, ${ds.colors.ocean[400]} 0%, ${ds.colors.ocean[500]} 100%);
    opacity: 0;
    z-index: -1;
    transition: opacity ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  }
  
  &:not(:disabled):not(.loading):active::after {
    opacity: 0.3;
    filter: blur(10px);
  }
`;

export const FloatingActionButton = ({ children, ...props }) => (
  <FABContainer variant="primary" {...props}>
    {children}
  </FABContainer>
);

export default TouchButton;