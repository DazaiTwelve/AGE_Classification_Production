import React, { useRef, useState } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Container,
  Box, Typography, Card, CardContent, Button,
  CircularProgress, Alert, Grid, Snackbar, Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { analyzeImage, formatFileSize } from './utils/api';
import config from './config';
import './App.css';

const theme = createTheme({
  palette: {
    primary: { main: '#1e293b' },
    secondary: { main: '#64748b' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 600, letterSpacing: '-0.02em', fontSize: '2.5rem' },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
});

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendMessage, setBackendMessage] = useState('');
  const [ageAnnotatedImageUrl, setAgeAnnotatedImageUrl] = useState(null);
  const [autismAnnotatedImageUrl, setAutismAnnotatedImageUrl] = useState(null);
  const [ageAnalysis, setAgeAnalysis] = useState({});
  const [autismAnalysis, setAutismAnalysis] = useState({});
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const webcamRef = useRef(null);
  const [showWebcam, setShowWebcam] = useState(false);

  // Image upload handler
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetStateExceptImage();
      setSnackbar({
        open: true,
        message: `Image uploaded: ${file.name} (${formatFileSize(file.size)})`,
        severity: 'success',
      });
    }
  };

  // Webcam capture handler
  const captureFromWebcam = () => {
    const screenshot = webcamRef.current.getScreenshot();
    fetch(screenshot)
      .then(res => res.blob())
      .then(blob => {
        const webcamFile = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(webcamFile);
        setPreviewUrl(screenshot);
        resetStateExceptImage();
        setSnackbar({
          open: true,
          message: 'Image captured from webcam',
          severity: 'success',
        });
      });
  };

  // Reset all state except image and preview URL
  const resetStateExceptImage = () => {
    setAgeAnalysis({});
    setAutismAnalysis({});
    setAutismAnnotatedImageUrl(null);
    setAgeAnnotatedImageUrl(null);
    setBackendMessage('');
    setError(null);
  };

  // Analyze button handler
  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    resetStateExceptImage();

    try {
      const res = await analyzeImage(selectedImage);
      console.log('🔍 Full API Response:', res);

      // Show backend message prominently
      setBackendMessage(res.message || '');

      // Extract and normalize age annotated image and analysis details
      if (res.age_check_summary && res.age_check_summary.annotated_image_url) {
        const url = res.age_check_summary.annotated_image_url.startsWith('http')
          ? res.age_check_summary.annotated_image_url
          : `${config.API_BASE_URL}${res.age_check_summary.annotated_image_url}`;
        setAgeAnnotatedImageUrl(url);
        setAgeAnalysis(res.age_check_summary || {});
      }

      // ✅ KEY ADDITION: Handle autism data only if not adult_invalid
      if (res.autism_prediction_data && res.autism_prediction_data.annotated_image_path) {
        if (res.status === 'adult_invalid') {
          // Console warning for adult invalid
          console.warn('⚠️ AUTISM SCANNING DISABLED: Adult detected (ages above 18). Autism analysis cannot be performed on adult subjects.');
          
          // Clear autism data for adults
          setAutismAnnotatedImageUrl(null);
          setAutismAnalysis({});
        } else {
          // Process autism data for valid child subjects
          const url = res.autism_prediction_data.annotated_image_path.startsWith('http')
            ? res.autism_prediction_data.annotated_image_path
            : `${config.API_BASE_URL}${res.autism_prediction_data.annotated_image_path}`;
          setAutismAnnotatedImageUrl(url);
          setAutismAnalysis(res.autism_prediction_data || {});
        }
      } else {
        // Clear autism info if missing
        setAutismAnnotatedImageUrl(null);
        setAutismAnalysis({});
      }

      // Additional console logging for adult_invalid status
      if (res.status === 'adult_invalid') {
        console.warn('🚫 ADULT INPUT REJECTED: The uploaded image contains only adults. Autism screening requires subjects under 18 years of age.');
      }

      setSnackbar({
        open: true,
        message: res.message || 'Analysis complete.',
        severity: res.status === 'adult_invalid' ? 'warning' : 'success',
      });
    } catch (err) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset all state and image selections
  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAgeAnalysis({});
    setAutismAnalysis({});
    setAgeAnnotatedImageUrl(null);
    setAutismAnnotatedImageUrl(null);
    setBackendMessage('');
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // Component for confidence chip
  const ConfidenceLevel = ({ confidence }) => {
    const getConfidenceColor = (conf) => (
      conf >= 70 ? '#16a34a' : conf >= 40 ? '#ca8a04' : '#dc2626'
    );
    return (
      <Chip
        label={`${confidence.toFixed(1)}%`}
        size="small"
        variant="outlined"
        sx={{
          borderColor: getConfidenceColor(confidence),
          color: getConfidenceColor(confidence),
          fontWeight: 600,
        }}
      />
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box textAlign="center" mb={4}>
            <Typography variant="h2" gutterBottom sx={{ color: '#0f172a', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Autism Detection AI
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2, fontWeight: 400 }}>
              Advanced AI-powered autism screening through facial analysis
            </Typography>
          </Box>

          <Grid container spacing={4} sx={{ flex: 1, overflow: 'visible' }}>
            {/* Upload Section */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon sx={{ fontSize: 24, color: '#1e293b' }} />
                    Upload or Capture Image
                  </Typography>
                  <Box
                    onClick={() => document.getElementById('image-input').click()}
                    sx={{
                      border: '2px dashed #e2e8f0', p: 4, textAlign: 'center', cursor: 'pointer',
                      borderRadius: 3, bgcolor: '#fafafa', transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#1e293b', bgcolor: '#f5f5f5' },
                    }}
                  >
                    <input id="image-input" type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                    <CloudUploadIcon sx={{ fontSize: 48, color: '#475569', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#0f172a', mb: 1, fontWeight: 600 }}>Upload Image</Typography>
                    <Typography variant="body2" sx={{ color: '#475569' }}>Drag & drop or click to browse</Typography>
                  </Box>
                  <Box mt={3} textAlign="center">
                    <Button
                      variant="outlined"
                      startIcon={<CameraIcon />}
                      onClick={() => setShowWebcam(!showWebcam)}
                      sx={{ mb: 2, borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#1e293b', color: '#1e293b' } }}
                    >
                      {showWebcam ? 'Hide Camera' : 'Open Camera'}
                    </Button>
                    {showWebcam && (
                      <Box className="webcam-container">
                        <Box sx={{ border: '1px solid #f1f5f9', borderRadius: 3, p: 2, bgcolor: '#fafafa' }}>
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width={320}
                            height={240}
                            style={{ borderRadius: 8, border: '1px solid #f1f5f9' }}
                          />
                        </Box>
                        <Button onClick={captureFromWebcam} variant="contained" startIcon={<CameraIcon />} sx={{ mt: 2, bgcolor: '#1e293b', '&:hover': { bgcolor: '#0f172a' } }}>
                          Capture Photo
                        </Button>
                      </Box>
                    )}
                  </Box>
                  {previewUrl && (
                    <Box className="image-preview">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, border: '2px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Typography variant="body2" mt={1} color="text.secondary">
                        {selectedImage?.name || 'Captured Image'}
                      </Typography>
                    </Box>
                  )}
                  <Box className="action-buttons">
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={!selectedImage || isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={20} /> : <PsychologyIcon />}
                      size="large"
                      sx={{ bgcolor: '#1e293b', '&:hover': { bgcolor: '#0f172a' }, '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' } }}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button variant="outlined" onClick={handleReset} disabled={isProcessing} startIcon={<RefreshIcon />} size="large"
                      sx={{ borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#1e293b', color: '#1e293b' }, '&:disabled': { borderColor: '#f1f5f9', color: '#cbd5e1' } }}>
                      Reset
                    </Button>
                  </Box>
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <ErrorIcon sx={{ mr: 1 }} />
                      {error}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Results Section */}
            <Grid item xs={12} lg={8}>
              <Grid container spacing={2}>
                {/* Age Detection Card */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#1e293b', mb: 1, fontWeight: 600 }}>
                        Age Detection Visualization
                      </Typography>
                      {/* Show backend message if it's an adult_invalid or error */}
                      {backendMessage && (backendMessage.toLowerCase().includes('adult') || backendMessage.toLowerCase().includes('invalid') || backendMessage.toLowerCase().includes('error')) && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <strong>Adult Detected:</strong> {backendMessage}
                        </Alert>
                      )}
                      {ageAnnotatedImageUrl && (
                        <img
                          src={ageAnnotatedImageUrl}
                          alt="Age Detection Visualization"
                          style={{
                            width: '100%',
                            maxWidth: '350px',
                            height: 'auto',
                            borderRadius: 8,
                            border: '1px solid #f1f5f9',
                            display: 'block',
                            margin: '0 auto',
                            marginBottom: 14,
                          }}
                        />
                      )}
                      {ageAnalysis && (ageAnalysis.kids_count !== undefined || ageAnalysis.adults_count !== undefined) && (
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            Faces Detected: <strong>{(ageAnalysis.kids_count ?? 0) + (ageAnalysis.adults_count ?? 0)}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Kids: <strong>{ageAnalysis.kids_count ?? 0}</strong> &nbsp;|&nbsp;
                            Adults: <strong>{ageAnalysis.adults_count ?? 0}</strong>
                          </Typography>
                          {Array.isArray(ageAnalysis.annotations) && ageAnalysis.annotations.length > 0 && (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>Detected Age Groups:</Typography>
                              {ageAnalysis.annotations.map((ann, idx) => (
                                <Box key={idx} sx={{ border: '1px solid #e0e7ef', borderRadius: 1, p: 1, mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600 }}>
                                    Age: {ann.age}
                                  </Typography>
                                  {ann.box && (
                                    <Typography variant="caption" sx={{ color: '#475569' }}>
                                      Bounding Box: [{ann.box.join(', ')}]
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </>
                          )}
                          {ageAnalysis.has_faces === false && (
                            <Typography sx={{ color: "#f44336", mt: 1, fontWeight: 600 }}>No faces detected.</Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Autism Analysis Card */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#dc2626', mb: 1, fontWeight: 600 }}>
                        Autism Analysis Visualization
                      </Typography>
                      
                      {/* ✅ KEY ADDITION: Special notice for adult_invalid status */}
                      {backendMessage && backendMessage.toLowerCase().includes('adult') && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <strong>⚠️ Autism Scanning Disabled</strong>
                          <br />
                          Autism analysis cannot be performed on subjects above 18 years of age. Please upload an image containing children for autism screening.
                        </Alert>
                      )}

                      {/* Show autism annotated image if present */}
                      {autismAnnotatedImageUrl ? (
                        <img
                          src={autismAnnotatedImageUrl}
                          alt="Autism Analysis Visualization"
                          style={{
                            width: '100%',
                            maxWidth: '350px',
                            height: 'auto',
                            borderRadius: 8,
                            border: '1px solid #f1f5f9',
                            display: 'block',
                            margin: '0 auto',
                            marginBottom: 14,
                          }}
                        />
                      ) : (
                        <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center', fontStyle: 'italic' }}>
                          {backendMessage && backendMessage.toLowerCase().includes('adult') 
                            ? 'Autism analysis not available for adult subjects' 
                            : 'Autism analysis visualization will appear here'
                          }
                        </Typography>
                      )}

                      {/* Autism regional analysis results */}
                      {autismAnalysis.results && autismAnalysis.results.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            Regional Analysis:
                          </Typography>
                          {autismAnalysis.results.filter(r => r.region).map((r, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: 'white', border: '1px solid #e0e7ef', borderRadius: 1 }}>
                              <Typography variant="body2"><strong>{r.region}:</strong> {r.label}</Typography>
                              <ConfidenceLevel confidence={r.confidence} />
                            </Box>
                          ))}
                          {autismAnalysis.results.find(r => r.final_decision) && (
                            <Box sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2, p: 2, mt: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Final AI Decision
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700 }}>
                                {autismAnalysis.results.find(r => r.final_decision)?.final_decision}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              {/* Show processing spinner if analyzing */}
              { isProcessing && (
                <Box textAlign="center" py={3}>
                  <CircularProgress size={40} />
                  <Typography sx={{ mt: 2 }}>Processing image...</Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Footer */}
          <Box textAlign="center" mt={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Developed by Prasant Gupta And Team
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Snackbar for messages */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
