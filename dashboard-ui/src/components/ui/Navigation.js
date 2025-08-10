import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { slideInDown, pulse } from '../../styles/animations';
import ds from '../../styles/designSystem';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${ds.zIndex.sticky};
  
  /* Glass morphism background */
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${ds.colors.glassBorder};
  
  /* Animation */
  animation: ${slideInDown} ${ds.transitions.duration.slow} ${ds.transitions.easing.enter};
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  
  /* Shadow when scrolled */
  box-shadow: ${props => props.scrolled ? ds.shadows.md : 'none'};
`;

const NavContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${ds.spacing[4]} ${ds.spacing[6]};
  max-width: 1440px;
  margin: 0 auto;
`;

const NavBrand = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[3]};
`;

const NavLogo = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, ${ds.colors.sand[400]} 0%, ${ds.colors.sand[600]} 100%);
  border-radius: ${ds.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${ds.typography.fontWeight.bold};
  color: white;
  box-shadow: ${ds.shadows.sm};
  
  /* Subtle animation */
  animation: ${pulse} 4s ease-in-out infinite;
`;

const NavTitle = styled.h1`
  margin: 0;
  font-family: ${ds.typography.fontFamily.serif};
  font-size: ${ds.typography.fontSize.xl};
  font-weight: ${ds.typography.fontWeight.semibold};
  color: ${ds.colors.stone[900]};
  
  /* Hide on mobile */
  @media (max-width: ${ds.breakpoints.sm}) {
    display: none;
  }
`;

const NavItems = styled.div`
  display: flex;
  align-items: center;
  gap: ${ds.spacing[2]};
`;

const NavItem = styled.button`
  position: relative;
  padding: ${ds.spacing[2]} ${ds.spacing[4]};
  background: ${props => props.active ? ds.colors.sand[500] : 'transparent'};
  color: ${props => props.active ? 'white' : ds.colors.stone[700]};
  border: none;
  border-radius: ${ds.borderRadius.full};
  font-family: ${ds.typography.fontFamily.sans};
  font-size: ${ds.typography.fontSize.sm};
  font-weight: ${ds.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${ds.transitions.duration.base} ${ds.transitions.easing.smooth};
  -webkit-tap-highlight-color: transparent;
  
  /* Touch target */
  min-height: ${ds.touch.minTargetSize};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    transform: scale(${ds.touch.tapScale});
  }
  
  /* Notification dot */
  ${props => props.notification && `
    &::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      background: ${ds.colors.error};
      border-radius: ${ds.borderRadius.full};
      box-shadow: 0 0 0 2px white;
      animation: ${pulse} 2s ease-in-out infinite;
    }
  `}
`;

const NavDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${ds.colors.stone[300]};
  margin: 0 ${ds.spacing[2]};
`;

// Bottom navigation for mobile
const BottomNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: ${ds.zIndex.sticky};
  
  /* Glass morphism background */
  background: ${ds.colors.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid ${ds.colors.glassBorder};
  
  /* Safe area for devices with home indicator */
  padding-bottom: env(safe-area-inset-bottom);
  
  /* Hide on desktop */
  @media (min-width: ${ds.breakpoints.md}) {
    display: none;
  }
`;

const BottomNavItems = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${ds.spacing[2]} 0;
`;

const BottomNavItem = styled.button`
  position: relative;
  flex: 1;
  padding: ${ds.spacing[2]} 0;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${ds.spacing[1]};
  color: ${props => props.active ? ds.colors.sand[600] : ds.colors.stone[600]};
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all ${ds.transitions.duration.fast} ${ds.transitions.easing.smooth};
  
  /* Icon */
  svg {
    width: 24px;
    height: 24px;
    transition: transform ${ds.transitions.duration.fast} ${ds.transitions.easing.spring};
  }
  
  /* Label */
  span {
    font-size: ${ds.typography.fontSize.xs};
    font-weight: ${ds.typography.fontWeight.medium};
  }
  
  /* Active indicator */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) scaleX(${props => props.active ? 1 : 0});
    width: 32px;
    height: 3px;
    background: ${ds.colors.sand[600]};
    border-radius: 0 0 ${ds.borderRadius.full} ${ds.borderRadius.full};
    transition: transform ${ds.transitions.duration.base} ${ds.transitions.easing.spring};
  }
  
  &:active svg {
    transform: scale(0.9);
  }
`;

/**
 * Enhanced navigation component with responsive design and smooth transitions
 */
export const Navigation = ({ 
  brand = { title: 'Sand Collection' },
  items = [],
  activeItem,
  onItemClick,
  bottomNavItems = []
}) => {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <>
      <NavContainer scrolled={scrolled}>
        <NavContent>
          <NavBrand>
            <NavLogo>{brand.logo || 'S'}</NavLogo>
            <NavTitle>{brand.title}</NavTitle>
          </NavBrand>
          
          <NavItems>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.divider && index > 0 && <NavDivider />}
                <NavItem
                  active={activeItem === item.id}
                  notification={item.notification}
                  onClick={() => onItemClick(item)}
                >
                  {item.icon && <span style={{ marginRight: ds.spacing[2] }}>{item.icon}</span>}
                  {item.label}
                </NavItem>
              </React.Fragment>
            ))}
          </NavItems>
        </NavContent>
      </NavContainer>
      
      {bottomNavItems.length > 0 && (
        <BottomNav>
          <BottomNavItems>
            {bottomNavItems.map(item => (
              <BottomNavItem
                key={item.id}
                active={activeItem === item.id}
                onClick={() => onItemClick(item)}
              >
                {item.icon}
                <span>{item.label}</span>
              </BottomNavItem>
            ))}
          </BottomNavItems>
        </BottomNav>
      )}
    </>
  );
};

export default Navigation;