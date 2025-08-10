import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Camera, X, Upload, 
  Sparkles, Check, Loader2
} from 'lucide-react';
import { colors, spacing, shadows, typography } from '../../styles/designSystem';
import { fadeIn, slideInUp, bounce } from '../../styles/animations';
import { TouchButton } from '../ui/TouchButton';
import { TouchCard } from '../ui/TouchCard';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacing.lg};
`;

const FormContainer = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 24px;
  box-shadow: ${shadows.xl};
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${colors.stone[100]};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${colors.stone[300]};
    border-radius: 4px;
  }
`;

const Header = styled.div`
  padding: ${spacing.xl};
  border-bottom: 1px solid ${colors.stone[200]};
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  border-radius: 24px 24px 0 0;
`;

const Title = styled.h2`
  font-family: ${typography.fontFamily.serif};
  font-size: ${typography.fontSize['2xl']};
  color: ${colors.stone[900]};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const CloseButton = styled(TouchButton)`
  position: absolute;
  top: ${spacing.lg};
  right: ${spacing.lg};
`;

const FormBody = styled.div`
  padding: ${spacing.xl};
`;

const FormSection = styled(motion.div)`
  margin-bottom: ${spacing.xl};
`;

const Label = styled.label`
  display: block;
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.stone[700]};
  margin-bottom: ${spacing.sm};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  width: 100%;
  padding: ${spacing.md};
  font-size: ${typography.fontSize.md};
  border: 2px solid ${colors.stone[200]};
  border-radius: 12px;
  background: ${colors.stone[50]};
  color: ${colors.stone[900]};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: white;
    box-shadow: 0 0 0 4px ${colors.primaryAlpha};
  }
  
  &::placeholder {
    color: ${colors.stone[400]};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${spacing.md};
  font-size: ${typography.fontSize.md};
  font-family: ${typography.fontFamily.sans};
  border: 2px solid ${colors.stone[200]};
  border-radius: 12px;
  background: ${colors.stone[50]};
  color: ${colors.stone[900]};
  transition: all 0.3s ease;
  min-height: 150px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: white;
    box-shadow: 0 0 0 4px ${colors.primaryAlpha};
  }
  
  &::placeholder {
    color: ${colors.stone[400]};
  }
`;

const LocationPicker = styled(TouchCard)`
  padding: ${spacing.lg};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${spacing.md};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${colors.primary};
    background: ${colors.sand[50]};
  }
`;

const LocationText = styled.div`
  flex: 1;
  
  .placeholder {
    color: ${colors.stone[400]};
  }
  
  .location-name {
    font-weight: ${typography.fontWeight.medium};
    color: ${colors.stone[900]};
  }
  
  .location-address {
    font-size: ${typography.fontSize.sm};
    color: ${colors.stone[600]};
    margin-top: ${spacing.xs};
  }
`;

const MediaUpload = styled.div`
  border: 2px dashed ${colors.stone[300]};
  border-radius: 12px;
  padding: ${spacing.xl};
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${colors.stone[50]};
  
  &:hover {
    border-color: ${colors.primary};
    background: ${colors.sand[50]};
  }
  
  input {
    display: none;
  }
`;

const MediaPreview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${spacing.md};
  margin-top: ${spacing.lg};
`;

const MediaThumb = styled(motion.div)`
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: ${colors.stone[100]};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .remove {
    position: absolute;
    top: ${spacing.xs};
    right: ${spacing.xs};
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover .remove {
    opacity: 1;
  }
`;

const DatePicker = styled(TouchCard)`
  padding: ${spacing.md};
  display: flex;
  align-items: center;
  gap: ${spacing.md};
  cursor: pointer;
  
  input {
    border: none;
    background: none;
    outline: none;
    font-size: ${typography.fontSize.md};
    color: ${colors.stone[900]};
    flex: 1;
  }
`;

const Footer = styled.div`
  padding: ${spacing.xl};
  border-top: 1px solid ${colors.stone[200]};
  display: flex;
  gap: ${spacing.md};
  justify-content: flex-end;
  background: ${colors.stone[50]};
  border-radius: 0 0 24px 24px;
`;

const SuccessAnimation = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${shadows.xl};
`;

export const EnhancedEntryForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    location: null,
    date: new Date().toISOString().split('T')[0],
    media: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = () => {
    // In a real app, this would open a map picker
    // For now, we'll simulate with a mock location
    const mockLocation = {
      name: 'Bondi Beach',
      address: 'Bondi Beach, Sydney NSW 2026, Australia',
      coordinates: { lat: -33.890542, lng: 151.274856 }
    };
    handleInputChange('location', mockLocation);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }));
    
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }));
  };

  const removeMedia = (mediaId) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.id !== mediaId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      onSubmit(formData);
      onClose();
    }, 1000);
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <FormContainer
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Header>
          <Title>
            <Sparkles size={24} color={colors.primary} />
            Add New Entry
          </Title>
          <CloseButton
            variant="ghost"
            size="sm"
            icon={<X size={20} />}
            onClick={onClose}
          />
        </Header>

        <form onSubmit={handleSubmit}>
          <FormBody>
            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label>Title</Label>
              <Input
                type="text"
                placeholder="Give your sand sample a memorable name..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label>Story</Label>
              <TextArea
                placeholder="What makes this sand special? Share the story behind this sample..."
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                required
              />
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label>Location</Label>
              <LocationPicker onClick={handleLocationSelect}>
                <MapPin size={24} color={colors.primary} />
                <LocationText>
                  {formData.location ? (
                    <>
                      <div className="location-name">{formData.location.name}</div>
                      <div className="location-address">{formData.location.address}</div>
                    </>
                  ) : (
                    <div className="placeholder">Select collection location...</div>
                  )}
                </LocationText>
              </LocationPicker>
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label>Collection Date</Label>
              <DatePicker>
                <Calendar size={20} color={colors.primary} />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </DatePicker>
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label>Photos & Videos</Label>
              <MediaUpload onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                />
                <Upload size={32} color={colors.stone[400]} />
                <p style={{ 
                  marginTop: spacing.md,
                  color: colors.stone[600]
                }}>
                  Click to upload photos or videos
                </p>
              </MediaUpload>
              
              {formData.media.length > 0 && (
                <MediaPreview>
                  <AnimatePresence>
                    {formData.media.map((media) => (
                      <MediaThumb
                        key={media.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', damping: 20 }}
                      >
                        <img src={media.url} alt="" />
                        <div 
                          className="remove"
                          onClick={() => removeMedia(media.id)}
                        >
                          <X size={14} />
                        </div>
                      </MediaThumb>
                    ))}
                  </AnimatePresence>
                </MediaPreview>
              )}
            </FormSection>
          </FormBody>

          <Footer>
            <TouchButton
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </TouchButton>
            <TouchButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
            >
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </TouchButton>
          </Footer>
        </form>

        <AnimatePresence>
          {showSuccess && (
            <SuccessAnimation
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              >
                <Check size={48} color={colors.success} strokeWidth={3} />
              </motion.div>
            </SuccessAnimation>
          )}
        </AnimatePresence>
      </FormContainer>
    </Overlay>
  );
};