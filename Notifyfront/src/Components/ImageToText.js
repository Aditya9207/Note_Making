import { useState, useRef } from "react";
import axios from "axios";

// Custom Modal/Message Box Component
const CustomAlert = ({ title, message, type, onClose }) => {
  let bgColor = 'bg-blue-100';
  let textColor = 'text-blue-800';
  let borderColor = 'border-blue-500';
  let titleColor = 'text-blue-700';

  if (type === 'error') {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    borderColor = 'border-red-500';
    titleColor = 'text-red-700';
  } else if (type === 'success') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    borderColor = 'border-green-500';
    titleColor = 'text-green-700';
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className={`relative ${bgColor} ${borderColor} border-t-4 rounded-b text-center p-4 shadow-lg mx-4 w-full max-w-sm`}>
        <h3 className={`font-bold text-lg mb-2 ${titleColor}`}>{title}</h3>
        <p className={`${textColor} mb-4`}>{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          OK
        </button>
      </div>
    </div>
  );
};

const ImageToText = () => {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [text, setText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  // State for the custom alert modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info"); // 'info', 'success', 'error'

  // Function to display the custom alert
  const showCustomAlert = (title, message, type = "info") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  // Function to close the custom alert
  const closeCustomAlert = () => {
    setShowModal(false);
  };

  const handleImageUpload = (event) => {
    const uploaded = event.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      setImagePreview(URL.createObjectURL(uploaded));
      setText("");
      setEnhancedText("");
      setProgress(0);
      // Clean up previous object URL if any to prevent memory leaks
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch (err) {
      showCustomAlert("Camera Error", "Could not access camera: " + err.message, "error");
      console.error("Camera access error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      setFile(blob);
      setImagePreview(URL.createObjectURL(blob));
      setText("");
      setEnhancedText("");
      setProgress(0);
      stopCamera();
    }, 'image/jpeg');
  };

  const extractText = async () => {
    if (!file) {
      showCustomAlert("No Image", "Please upload an image or take a photo first.", "info");
      return;
    }
    setLoading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        'http://localhost:5000/api/ocr/image-to-text',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
      );

      if (response.data.IsErroredOnProcessing) {
        throw new Error(response.data.ErrorMessage);
      }

      const extractedText = response.data.ParsedResults?.[0]?.ParsedText || "";
      setText(extractedText.trim());
      showCustomAlert("Text Extracted!", "Text has been successfully extracted from the image.", "success");
    } catch (error) {
      console.error("Error extracting text:", error);
      setText("Error extracting text."); // Clear out previous partial text
      showCustomAlert("Extraction Failed", "Error extracting text: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const enhanceText = async () => {
    if (!text || text.trim().length < 10) {
      showCustomAlert("Input Too Short", "Please extract some text first (at least 10 characters) before enhancing.", "info");
      return;
    }

    setAiLoading(true);
    setEnhancedText("Enhancing text... (this may take a few moments)");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/enhance-text",
        { text: text.trim() },
        { timeout: 30000 } // 30 second timeout
      );

      if (response.data.success) {
        setEnhancedText(response.data.enhancedText);
        showCustomAlert("Text Enhanced!", `Successfully enhanced text using ${response.data.serviceUsed}. Processing time: ${response.data.processingTime}ms.`, "success");
        console.log(`Used model: ${response.data.serviceUsed || 'fallback'}`);
      } else {
        // Backend indicated failure, but might still provide basic text
        setEnhancedText(response.data.enhancedText || "Could not enhance text.");
        showCustomAlert("Enhancement Failed", `AI enhancement unavailable: ${response.data.message}. Used basic formatting.`, "error");
      }
    } catch (error) {
      console.error("Enhancement error:", error);

      // Fallback to simple cleaning in case of API error
      const cleaned = text
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/\s+/g, ' ')
        .trim();

      setEnhancedText(cleaned);
      showCustomAlert("Enhancement Service Unavailable", "Text enhancement service is currently unavailable due to an error. Used basic formatting.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = enhancedText || text;
    if (!textToCopy) {
      showCustomAlert("Nothing to Copy", "There is no text to copy.", "info");
      return;
    }
    // Using modern clipboard API for better practice, wrapped in try/catch for potential security errors in some environments
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showCustomAlert("Copied!", "Text copied to clipboard successfully!", "success");
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
        // Fallback for environments where navigator.clipboard.writeText might not work (e.g., older browsers, strict iframes)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showCustomAlert("Copied!", "Text copied to clipboard successfully (fallback method)! You might need to paste manually in some cases.", "success");
        } catch (execErr) {
            showCustomAlert("Copy Failed", "Could not copy text to clipboard. Please select and copy manually.", "error");
            console.error("Fallback copy failed:", execErr);
        }
      });
  };

  return (
    <div
      className={`relative p-4 bg-gray-300 rounded-lg flex flex-col space-y-4 max-w-xl mx-auto transition-all duration-300`}
    >
      {/* Input controls: File upload and Camera */}
      <div className="flex items-center space-x-2">
        <label className="flex-1 relative">
          <input
            type="file"
            accept="image/*"
            className="w-full p-2 border rounded-md opacity-0 absolute cursor-pointer"
            onChange={handleImageUpload}
            capture="environment" // Hint for mobile to use rear camera
          />
          <div className="p-2 bg-blue-600 text-white rounded-md text-center cursor-pointer hover:bg-blue-700">
            Choose File
          </div>
        </label>

        {/* Camera Button - Only show if camera is supported */}
        {navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (
          <button
            onClick={showCamera ? stopCamera : startCamera}
            className="p-2 bg-blue-500 text-white rounded-md flex items-center justify-center hover:bg-blue-600 transition-colors"
            title={showCamera ? "Stop Camera" : "Use Camera"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Camera Stream and Photo Button */}
      {showCamera && (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto border rounded-md" />
          <button
            onClick={takePhoto}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            📷
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && !showCamera && (
        <img
          src={imagePreview}
          alt="Preview"
          className="w-full h-52 object-contain rounded-md border bg-gray-100" // object-contain to prevent cropping
        />
      )}

      {/* Extract Text Button */}
      <button
        onClick={extractText}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        disabled={loading || !file} // Disable if no file is selected
      >
        {loading ? `Extracting... (${progress}%)` : "Extract Text"}
      </button>

      {/* Extracted Text Area */}
      <textarea
        readOnly
        className="w-full p-2 h-40 border rounded-md bg-gray-50 text-gray-800 resize-y"
        value={text}
        placeholder="Extracted text will appear here..."
      />

      {/* Enhance Text Button */}
      <button
        onClick={enhanceText}
        disabled={aiLoading || !text || text.trim().length < 10} // Disable if no text or text is too short
        className={`p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2
          ${(aiLoading || !text || text.trim().length < 10) ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {aiLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.001 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enhancing...
          </span>
        ) : "Enhance Text"}
      </button>

      {/* Enhanced Text Area */}
      <textarea
        readOnly
        className="w-full p-2 h-40 border rounded-md bg-gray-50 text-gray-800 resize-y"
        value={enhancedText}
        placeholder="Enhanced text will appear here..."
      />

      {/* Copy to Clipboard Button */}
      <button
        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={copyToClipboard}
        disabled={!text && !enhancedText} // Disable if no text in either field
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
        <span>Copy to Clipboard</span>
      </button>

      {/* Custom Alert Modal */}
      {showModal && (
        <CustomAlert
          title={modalTitle}
          message={modalMessage}
          type={modalType}
          onClose={closeCustomAlert}
        />
      )}
    </div>
  );
};

export default ImageToText;
