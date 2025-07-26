import React from 'react';
import styled from 'styled-components';

// Styled components for the dashboard layout
const DashboardContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const LeftColumn = styled.div`
  width: 250px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
`;

const CenterColumn = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const RightColumn = styled.div`
  width: 350px;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
  border-left: 1px solid #e0e0e0;
`;

const TopSection = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 16px;
`;

const BottomSection = styled.div`
  height: 220px;
  overflow: hidden;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
`;

/**
 * Main dashboard layout with three columns:
 * - Left column (250px): Type and Region charts
 * - Center column (flex): Map view (top) and Timeline chart (bottom)
 * - Right column (350px): Vertical timeline of entries
 */
const DashboardLayout = ({
  leftColumnContent,
  mapContent,
  timelineChartContent,
  rightColumnContent
}) => {
  return (
    <DashboardContainer>
      <LeftColumn>
        {leftColumnContent}
      </LeftColumn>
      
      <CenterColumn>
        <TopSection>
          {mapContent}
        </TopSection>
        
        <BottomSection>
          {timelineChartContent}
        </BottomSection>
      </CenterColumn>
      
      <RightColumn>
        <SectionTitle>Entries</SectionTitle>
        {rightColumnContent}
      </RightColumn>
    </DashboardContainer>
  );
};

export default DashboardLayout;