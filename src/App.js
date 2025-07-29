import React, { useState, useRef, useCallback } from 'react';

// Cloud icon component
const CloudIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 16C4.79 16 3 14.21 3 12C3 9.79 4.79 8 7 8C7.19 8 7.38 8.01 7.56 8.03C8.54 6.69 10.06 6 11.7 6C14.55 6 16.9 8.35 16.9 11.2C16.9 11.21 16.9 11.22 16.9 11.23C17.5 11.23 18 11.73 18 12.33C18 12.93 17.5 13.43 16.9 13.43H7Z" fill="currentColor"/>
  </svg>
);

// Camera icon component
const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="currentColor"/>
    <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor"/>
  </svg>
);

// Alert component for error messages
const Alert = ({ message, type = 'error', onClose }) => {
  if (!message) return null;
  
  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      <button className="alert-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

// Confidence level component with color coding
const ConfidenceLevel = ({ confidence }) => {
  const getConfidenceClass = (confidence) => {
    if (confidence >= 70) return 'confidence-high';
    if (confidence >= 40) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <span className={getConfidenceClass(confidence)}>
      {confidence}%
    </span>
  );
};

// Prediction table component
const PredictionTable = ({ results }) => {
  if (!results || !Array.isArray(results)) return null;

  // Filter out the final_decision entry and only show region predictions
  const regionResults = results.filter(result => result.region);
  
  return (
    <table className="prediction-table">
      <thead>
        <tr>
          <th>Region</th>
          <th>Label</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>
        {regionResults.map((result, index) => (
          <tr key={index}>
            <td style={{ textTransform: 'capitalize' }}>{result.region}</td>
            <td>{result.label || 'N/A'}</td>
            <td>
              <ConfidenceLevel confidence={result.confidence || 0} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Age summary component
const AgeSummary = ({ ageCheckSummary }) => {
  if (!ageCheckSummary || !ageCheckSummary.annotations) return null;

  const ages = ageCheckSummary.annotations;
  
  const renderAge = (age, index) => {
    // Handle different age data types
    if (typeof age === 'object' && age !== null) {
      // If age is an object with age and box properties
      if (age.age !== undefined) {
        return (
          <p key={index}>
            Age: {age.age}
            {age.box && <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
              (Box: {JSON.stringify(age.box)})
            </span>}
          </p>
        );
      }
      // If it's some other object, stringify it
      return <p key={index}>Age: {JSON.stringify(age)}</p>;
    }
    
    // Handle primitive values
    return <p key={index}>Age: {String(age)}</p>;
  };
  
  return (
    <div className="age-summary">
      <h4>Detected Age(s)</h4>
      {Array.isArray(ages) ? 
        ages.map(renderAge)
        : 
        renderAge(ages, 0)
      }
    </div>
  );
};

// Main App component
function App() {
  // State management
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = (file) => {
    if (!file) {
      setError('No file selected');
      return false;
    }

    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please select an image file.');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File too large. Please select an image smaller than 10MB.');
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    setError(null);
    setResult(null);

    if (!validateFile(file)) {
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  // Handle file input change
  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    handleFileSelect(file);
  };

  // Handle drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle upload area click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle webcam button (no-op as specified)
  const handleWebcam = () => {
    // No-op as specified in requirements
    console.log('Webcam functionality not implemented');
  };

  // Handle reset
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle analyze
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('https://age-api-zzc8.onrender.com/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Unexpected result format');
      }

      setResult(data);
    } catch (error) {
      console.error('Analysis error:', error);
      
      if (error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message.includes('HTTP error')) {
        setError('Server error. Please try again later.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render results based on API response
  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="results-loading">
          <LoadingSpinner />
          <p>Analyzing image...</p>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="results-content">
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            Upload an image and click "Analyze" to get started
          </p>
        </div>
      );
    }

    // Add error boundary for unexpected data structures
    try {

    // Handle different response statuses
    if (result.status === 'child_autism_screened') {
      return (
        <div className="results-content">
          {/* Show annotated image if available */}
          {result.autism_prediction_data?.annotated_image_path && (
            <img 
              src={result.autism_prediction_data.annotated_image_path.startsWith('http') 
                ? result.autism_prediction_data.annotated_image_path 
                : `https://age-api-zzc8.onrender.com${result.autism_prediction_data.annotated_image_path}`
              }
              alt="Analysis result"
              className="result-image"
            />
          )}

          {/* Show predictions table */}
          {result.autism_prediction_data?.results && (
            <PredictionTable results={result.autism_prediction_data.results} />
          )}

          {/* Show final decision */}
          {result.autism_prediction_data?.results && (
            (() => {
              const finalDecision = result.autism_prediction_data.results.find(r => r.final_decision);
              return finalDecision ? (
                <div className={`final-decision ${finalDecision.final_decision.toLowerCase().includes('autistic') ? 'autistic' : 'non-autistic'}`}>
                  {finalDecision.final_decision}
                </div>
              ) : null;
            })()
          )}

          {/* Show age summary */}
          <AgeSummary ageCheckSummary={result.age_check_summary} />
        </div>
      );
    }

    if (result.status === 'adult_invalid') {
      return (
        <div className="results-content">
          {/* Show age-annotated image if available */}
          {result.annotated_image_url && (
            <img 
              src={result.annotated_image_url.startsWith('http') 
                ? result.annotated_image_url 
                : `https://age-api-zzc8.onrender.com${result.annotated_image_url}`
              }
              alt="Age analysis result"
              className="result-image"
            />
          )}

          <div className="adult-invalid">
            You are an adult. Invalid.
          </div>

          {/* Show age summary */}
          <AgeSummary ageCheckSummary={result.age_check_summary} />
        </div>
      );
    }

    // Handle unexpected response format
    return (
      <div className="results-content">
        <p style={{ color: '#c53030', textAlign: 'center', padding: '2rem' }}>
          Unexpected result format. Please try again.
        </p>
      </div>
    );
    } catch (error) {
      console.error('Error rendering results:', error);
      return (
        <div className="results-content">
          <p style={{ color: '#c53030', textAlign: 'center', padding: '2rem' }}>
            Error displaying results. Please try again.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="app-container">
      <h1 className="main-heading">Autism Detection AI</h1>
      
      <div className="main-content">
        {/* Upload Panel */}
        <div className="card">
          <h2>
            <CloudIcon />
            Upload or Capture Image
          </h2>
          
          <div 
            className={`upload-area ${isDragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="upload-icon">☁️</div>
            <div className="upload-text">Click to upload or drag and drop</div>
            <div className="upload-hint">Supports: JPG, PNG, GIF (Max 10MB)</div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="file-input"
          />

          {/* Image preview */}
          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Preview" />
            </div>
          )}

          {/* Action buttons */}
          <div className="button-group">
            <button 
              className="btn btn-secondary" 
              onClick={handleWebcam}
              disabled={isLoading}
            >
              <CameraIcon />
              Webcam
            </button>
            
            <button 
              className="btn btn-primary" 
              onClick={handleAnalyze}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? <LoadingSpinner /> : '🔍'}
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
            
            <button 
              className="btn btn-secondary" 
              onClick={handleReset}
              disabled={isLoading}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card">
          <h2>📊 Analysis Results</h2>
          
          {/* Error alert */}
          <Alert 
            message={error} 
            type="error" 
            onClose={() => setError(null)} 
          />
          
          {/* Results content */}
          {renderResults()}
        </div>
      </div>
    </div>
  );
}

export default App; 