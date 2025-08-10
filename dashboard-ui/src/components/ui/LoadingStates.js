import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { colors, spacing, typography } from '../../styles/designSystem';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const rotate = keyframes`
  to { transform: rotate(360deg); }
`;

// Skeleton Loader
const SkeletonWrapper = styled.div`
  background: linear-gradient(
    90deg,
    ${colors.stone[200]} 25%,
    ${colors.stone[100]} 50%,
    ${colors.stone[200]} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: ${props => props.$radius || '8px'};
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  margin-bottom: ${props => props.$mb || '0'};
`;

export const Skeleton = ({ width, height, radius, mb }) => (
  <SkeletonWrapper 
    $width={width} 
    $height={height} 
    $radius={radius}
    $mb={mb}
  />
);

// Card Skeleton
export const CardSkeleton = () => (
  <div style={{ padding: spacing.lg }}>
    <Skeleton height="200px" radius="12px" mb={spacing.md} />
    <Skeleton width="60%" height="24px" mb={spacing.sm} />
    <Skeleton width="100%" height="16px" mb={spacing.xs} />
    <Skeleton width="80%" height="16px" />
  </div>
);

// Spinner Loader
const SpinnerWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div`
  width: ${props => props.$size || '40px'};
  height: ${props => props.$size || '40px'};
  border: 3px solid ${colors.stone[200]};
  border-top-color: ${colors.primary};
  border-radius: 50%;
  animation: ${rotate} 0.8s linear infinite;
`;

export const LoadingSpinner = ({ size, ...props }) => (
  <SpinnerWrapper {...props}>
    <Spinner $size={size} />
  </SpinnerWrapper>
);

// Dots Loader
const DotsWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const Dot = styled.div`
  width: ${props => props.$size || '8px'};
  height: ${props => props.$size || '8px'};
  background: ${colors.primary};
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite;
  animation-delay: ${props => props.$delay || '0s'};
`;

export const LoadingDots = ({ size }) => (
  <DotsWrapper>
    <Dot $size={size} $delay="0s" />
    <Dot $size={size} $delay="0.2s" />
    <Dot $size={size} $delay="0.4s" />
  </DotsWrapper>
);

// Progress Bar
const ProgressWrapper = styled.div`
  width: 100%;
  height: ${props => props.$height || '4px'};
  background: ${colors.stone[200]};
  border-radius: 100px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, 
    ${colors.primary} 0%, 
    ${colors.primaryLight} 100%
  );
  border-radius: 100px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: ${shimmer} 1.5s infinite;
  }
`;

export const ProgressBar = ({ progress = 0, height }) => (
  <ProgressWrapper $height={height}>
    <ProgressFill
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  </ProgressWrapper>
);

// Empty State
const EmptyWrapper = styled(motion.div)`
  text-align: center;
  padding: ${spacing['2xl']};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
`;

const EmptyIcon = styled.div`
  width: 120px;
  height: 120px;
  margin: 0 auto ${spacing.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.stone[100]};
  border-radius: 50%;
  position: relative;
  
  &::before {
    content: '📦';
    font-size: 48px;
    animation: ${float} 3s ease-in-out infinite;
  }
`;

const EmptyTitle = styled.h3`
  font-size: ${typography.fontSize.xl};
  color: ${colors.stone[700]};
  margin-bottom: ${spacing.md};
  font-weight: ${typography.fontWeight.medium};
`;

const EmptyDescription = styled.p`
  color: ${colors.stone[600]};
  max-width: 400px;
  line-height: ${typography.lineHeight.relaxed};
`;

export const EmptyState = ({ 
  title = "No items found", 
  description = "There are no items to display at the moment.",
  icon = '📦'
}) => (
  <EmptyWrapper
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <EmptyIcon>
      <span style={{ fontSize: '48px', animation: `${float} 3s ease-in-out infinite` }}>
        {icon}
      </span>
    </EmptyIcon>
    <EmptyTitle>{title}</EmptyTitle>
    <EmptyDescription>{description}</EmptyDescription>
  </EmptyWrapper>
);

// Full Page Loader
const FullPageWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.glass};
  backdrop-filter: blur(10px);
  z-index: 9999;
`;

const LoaderContent = styled(motion.div)`
  background: white;
  padding: ${spacing['2xl']};
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const LoaderIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto ${spacing.lg};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 4px solid ${colors.stone[200]};
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 4px solid transparent;
    border-top-color: ${colors.primary};
    border-radius: 50%;
    animation: ${rotate} 1s linear infinite;
  }
`;

const LoaderText = styled.p`
  color: ${colors.stone[600]};
  font-size: ${typography.fontSize.lg};
`;

export const FullPageLoader = ({ text = "Loading..." }) => (
  <FullPageWrapper>
    <LoaderContent
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <LoaderIcon />
      <LoaderText>{text}</LoaderText>
    </LoaderContent>
  </FullPageWrapper>
);

// List Skeleton
export const ListSkeleton = ({ count = 5 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ marginBottom: spacing.md }}>
        <CardSkeleton />
      </div>
    ))}
  </div>
);