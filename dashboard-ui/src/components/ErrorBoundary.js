import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 72px;
  color: #f44336;
  margin-bottom: 20px;
`;

const ErrorTitle = styled.h2`
  color: #333;
  margin-bottom: 16px;
  font-size: 24px;
`;

const ErrorMessage = styled.p`
  color: #666;
  margin-bottom: 24px;
  max-width: 500px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: 20px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  max-width: 600px;
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  pre {
    margin-top: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    color: #d32f2f;
  }
`;

const ReloadButton = styled.button`
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3a80d2;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // In production, this would send to Sentry, LogRocket, etc.
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleReset
        );
      }

      // Default fallback UI
      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>Oops! Something went wrong</ErrorTitle>
          <ErrorMessage>
            We're sorry, but something unexpected happened. 
            {this.state.errorCount > 1 && 
              ` This error has occurred ${this.state.errorCount} times.`
            }
          </ErrorMessage>
          
          <ReloadButton onClick={this.handleReload}>
            Reload Page
          </ReloadButton>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>
              <summary>Error Details (Development Only)</summary>
              <pre>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onError: PropTypes.func
};

ErrorBoundary.defaultProps = {
  fallback: null,
  onError: null
};

export default ErrorBoundary;