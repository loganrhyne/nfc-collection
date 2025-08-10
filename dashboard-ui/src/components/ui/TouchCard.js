import React, { useState } from 'react';
import styled from 'styled-components';
import { useTouchInteractions } from '../../hooks/useTouchInteractions';
import { scaleIn, float } from '../../styles/animations';
import ds from '../../styles/designSystem';

const CardContainer = styled.div`
  position: relative;
  background: ${props => props.glass ? ds.colors.glass : 'white'};
  border-radius: ${ds.borderRadius.xl};
  overflow: hidden;
  
  /* Elevations */
  box-shadow: ${props => {
    if (props.elevation === 'none') return 'none';
    if (props.isPressed) return ds.shadows.sm;
    if (props.isHovered) return ds.shadows.xl;
    return ds.shadows[props.elevation || 'md'];
  }};
  
  /* Glass morphism effect */
  ${props => props.glass && `
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid ${ds.colors.glassBorder};
  `}
  
  /* Animations */
  animation: ${scaleIn} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  transform: ${props => {
    if (props.isPressed) return `scale(${ds.touch.tapScale})`;
    if (props.isHovered) return 'scale(1.02) translateY(-2px)';
    return 'scale(1)';
  }};
  
  /* Interactive states */
  cursor: ${props => props.interactive ? 'pointer' : 'default'};
  -webkit-tap-highlight-color: transparent;
  
  /* Floating animation for special cards */
  ${props => props.floating && `
    animation: ${float} 6s ease-in-out infinite;
    animation-delay: ${props.floatDelay || '0s'};
  `}
  
  /* Gradient border effect */
  ${props => props.gradientBorder && `
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: ${ds.borderRadius.xl};
      padding: 2px;
      background: linear-gradient(135deg, ${ds.colors.sand[400]}, ${ds.colors.ocean[400]});
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: ${props.isHovered ? 1 : 0.5};
      transition: opacity ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
    }
  `}
`;

const CardContent = styled.div`
  position: relative;
  padding: ${props => props.compact ? ds.spacing[4] : ds.spacing[6]};
  
  ${props => props.centered && `
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${ds.spacing[4]};
`;

const CardTitle = styled.h3`
  margin: 0;
  font-family: ${ds.typography.fontFamily.serif};
  font-size: ${ds.typography.fontSize['2xl']};
  font-weight: ${ds.typography.fontWeight.semibold};
  color: ${ds.colors.stone[900]};
  line-height: ${ds.typography.lineHeight.tight};
`;

const CardSubtitle = styled.p`
  margin: ${ds.spacing[2]} 0 0;
  font-size: ${ds.typography.fontSize.sm};
  color: ${ds.colors.stone[600]};
  line-height: ${ds.typography.lineHeight.relaxed};
`;

const CardBody = styled.div`
  font-size: ${ds.typography.fontSize.base};
  color: ${ds.colors.stone[700]};
  line-height: ${ds.typography.lineHeight.relaxed};
`;

const CardFooter = styled.div`
  margin-top: ${ds.spacing[6]};
  padding-top: ${ds.spacing[4]};
  border-top: 1px solid ${ds.colors.stone[200]};
  display: flex;
  align-items: center;
  justify-content: ${props => props.align || 'flex-start'};
  gap: ${ds.spacing[3]};
`;

const CardImage = styled.div`
  position: relative;
  width: 100%;
  height: ${props => props.height || '200px'};
  background: ${props => props.src ? `url(${props.src})` : ds.colors.stone[200]};
  background-size: cover;
  background-position: center;
  margin: ${props => props.inset ? `0` : `-${ds.spacing[6]} -${ds.spacing[6]} ${ds.spacing[6]}`};
  
  /* Overlay gradient */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.1) 100%);
  }
`;

const CardBadge = styled.span`
  position: absolute;
  top: ${ds.spacing[4]};
  right: ${ds.spacing[4]};
  padding: ${ds.spacing[1]} ${ds.spacing[3]};
  background: ${props => props.color || ds.colors.sand[500]};
  color: white;
  font-size: ${ds.typography.fontSize.xs};
  font-weight: ${ds.typography.fontWeight.semibold};
  border-radius: ${ds.borderRadius.full};
  box-shadow: ${ds.shadows.sm};
`;

/**
 * Enhanced card component with delightful touch interactions
 */
export const TouchCard = ({
  children,
  title,
  subtitle,
  image,
  badge,
  footer,
  interactive = false,
  glass = false,
  gradientBorder = false,
  floating = false,
  floatDelay,
  elevation = 'md',
  compact = false,
  centered = false,
  onClick,
  onLongPress,
  className,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const { handlers, isPressed } = useTouchInteractions({
    onTap: interactive ? onClick : undefined,
    onLongPress: interactive ? onLongPress : undefined,
  });
  
  return (
    <CardContainer
      className={className}
      interactive={interactive}
      glass={glass}
      gradientBorder={gradientBorder}
      floating={floating}
      floatDelay={floatDelay}
      elevation={elevation}
      isPressed={isPressed}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...(interactive ? handlers : {})}
      {...props}
    >
      {badge && <CardBadge color={badge.color}>{badge.text}</CardBadge>}
      
      {image && !image.inset && (
        <CardImage src={image.src} height={image.height} />
      )}
      
      <CardContent compact={compact} centered={centered}>
        {(title || subtitle) && (
          <CardHeader>
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
            </div>
          </CardHeader>
        )}
        
        {image && image.inset && (
          <CardImage src={image.src} height={image.height} inset />
        )}
        
        {children && <CardBody>{children}</CardBody>}
        
        {footer && (
          <CardFooter align={footer.align}>
            {footer.content || footer}
          </CardFooter>
        )}
      </CardContent>
    </CardContainer>
  );
};

// Specialized card variants
export const GlassCard = (props) => <TouchCard glass {...props} />;
export const FloatingCard = (props) => <TouchCard floating {...props} />;
export const InteractiveCard = (props) => <TouchCard interactive gradientBorder {...props} />;

export default TouchCard;