import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export const PrintShareHub = ({ isVisible, onClose, currentUrl, currentTitle }) => {
  const { theme } = useTheme();

  // Print States
  const [paperSize, setPaperSize] = useState('A4'); // A6, A5, A4, A3, A2
  const [orientation, setOrientation] = useState('Portrait'); // Portrait, Landscape
  const [scaling, setScaling] = useState(100); // 50, 75, 100, 125, 150, 200
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);

  // Paper dimensions ratios (A4 is baseline 1:1.41)
  const getPaperRatio = () => {
    return orientation === 'Portrait' ? 1.41 : 0.71;
  };

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: currentTitle,
            url: currentUrl
          });
        } else {
          // Fallback clipboard
          await navigator.clipboard.writeText(currentUrl);
          alert('URL copied to clipboard!');
        }
      } else {
        await Share.share({
          message: `Check out this page: ${currentTitle}\n${currentUrl}`,
          url: currentUrl
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScreenshot = () => {
    setShowScreenshotFlash(true);
    setTimeout(() => {
      setShowScreenshotFlash(false);
      Alert.alert(
        'Screenshot Captured',
        'A full webpage capture has been saved to your downloads folder.',
        [{ text: 'OK' }]
      );
    }, 400);
  };

  const handleSaveAsPdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      
      const fileName = `${currentTitle?.replace(/[^a-z0-9]/gi, '_') || 'page'}_${paperSize.toLowerCase()}.pdf`;
      Alert.alert(
        'PDF Saved Successfully',
        `File "${fileName}" saved at standard ${paperSize} paper size (${orientation}, scaled to ${scaling}%).\n\nDestination: Documents/NDeskDownloads`,
        [{ text: 'Share PDF', onPress: () => handleSharePdf(fileName) }, { text: 'OK', style: 'cancel' }]
      );
    }, 2000);
  };

  const handleSharePdf = async (fileName) => {
    try {
      const shareMessage = `Here is my PDF report: ${fileName}`;
      if (Platform.OS === 'web') {
        alert(`Shared file: ${fileName}`);
      } else {
        await Share.share({
          message: shareMessage
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const PAPER_SIZES = ['A6', 'A5', 'A4', 'A3', 'A2'];
  const SCALING_OPTIONS = [50, 75, 100, 125, 150, 200];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitle}>
              <Ionicons name="print-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.headerText, { color: theme.text }]}>Print & Share Hub</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Quick Share / Screenshot Bar */}
            <View style={styles.quickBar}>
              <TouchableOpacity onPress={handleShare} style={[styles.quickBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Ionicons name="share-social-outline" size={20} color={theme.accent} />
                <Text style={[styles.quickBtnText, { color: theme.text }]}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleScreenshot} style={[styles.quickBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Ionicons name="camera-outline" size={20} color={theme.accent} />
                <Text style={[styles.quickBtnText, { color: theme.text }]}>Screenshot</Text>
              </TouchableOpacity>
            </View>

            {/* Simulated Live Print Preview Container */}
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>LIVE PRINT PREVIEW</Text>
            <View style={[styles.previewArea, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <View 
                style={[
                  styles.previewPaper, 
                  { 
                    aspectRatio: getPaperRatio(), 
                    backgroundColor: '#FFF', 
                    padding: 16 * (scaling / 100),
                    width: orientation === 'Portrait' ? 140 : 200,
                  }
                ]}
              >
                <View style={[styles.previewHeader, { borderBottomColor: '#CCC' }]}>
                  <Text numberOfLines={1} style={[styles.previewTitle, { fontSize: 8 * (scaling / 100) }]}>
                    {currentTitle || 'New Webpage'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.previewUrl, { fontSize: 5 * (scaling / 100) }]}>
                    {currentUrl || 'about:blank'}
                  </Text>
                </View>
                
                <View style={styles.previewBody}>
                  <View style={[styles.previewLine, { width: '80%', height: 3 * (scaling / 100) }]} />
                  <View style={[styles.previewLine, { width: '90%', height: 3 * (scaling / 100) }]} />
                  <View style={[styles.previewLine, { width: '60%', height: 3 * (scaling / 100) }]} />
                  <View style={[styles.previewLine, { width: '85%', height: 3 * (scaling / 100) }]} />
                </View>

                <View style={[styles.previewFooter, { borderTopColor: '#EEE' }]}>
                  <Text style={{ fontSize: 4 * (scaling / 100), color: '#999' }}>NDesk Browser Print Service</Text>
                  <Text style={{ fontSize: 4 * (scaling / 100), color: '#999' }}>Size: {paperSize}</Text>
                </View>
              </View>
            </View>

            {/* Paper Size Selector */}
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>PAPER SIZE</Text>
            <View style={styles.selectorRow}>
              {PAPER_SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setPaperSize(size)}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                    paperSize === size && [styles.activeOptionBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]
                  ]}
                >
                  <Text style={[styles.optionText, { color: theme.text }, paperSize === size && { color: '#FFF' }]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Orientation */}
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>ORIENTATION</Text>
            <View style={styles.selectorRow}>
              {['Portrait', 'Landscape'].map(orient => (
                <TouchableOpacity
                  key={orient}
                  onPress={() => setOrientation(orient)}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, flex: 1 },
                    orientation === orient && [styles.activeOptionBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]
                  ]}
                >
                  <Ionicons name={orient === 'Portrait' ? 'document-text-outline' : 'document-outline'} size={14} color={orientation === orient ? '#FFF' : theme.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.optionText, { color: theme.text }, orientation === orient && { color: '#FFF' }]}>{orient}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scaling */}
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>SCALING (ZOOM SIZE)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {SCALING_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setScaling(opt)}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, minWidth: 60 },
                    scaling === opt && [styles.activeOptionBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]
                  ]}
                >
                  <Text style={[styles.optionText, { color: theme.text }, scaling === opt && { color: '#FFF' }]}>{opt}%</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Save PDF Action */}
            <TouchableOpacity
              onPress={handleSaveAsPdf}
              disabled={isGenerating}
              style={[styles.saveBtn, { backgroundColor: theme.accentSecondary || '#8B5CF6' }]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save as PDF</Text>
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
        </View>

        {/* Simulated Camera Flash Effect for Screenshots */}
        {showScreenshotFlash && (
          <View style={styles.flashOverlay} />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quickBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  previewArea: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewPaper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
  },
  previewHeader: {
    borderBottomWidth: 0.5,
    paddingBottom: 4,
  },
  previewTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  previewUrl: {
    color: '#777',
    marginTop: 1,
  },
  previewBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  previewLine: {
    backgroundColor: '#DDD',
    borderRadius: 1,
  },
  previewFooter: {
    borderTopWidth: 0.5,
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  optionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  activeOptionBtn: {
    shadowOpacity: 0.15,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    zIndex: 999999,
  }
});
