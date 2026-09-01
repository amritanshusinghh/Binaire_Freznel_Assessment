import { useState, useRef } from 'react';

function FileUploader({ socketId }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [priority, setPriority] = useState('low');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);

    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.name.toLowerCase().endsWith('.csv')
    );

    if (dropped.length > 0) {
      setSelectedFiles(prev => [...prev, ...dropped]);
    }
  }

  function handleFileInput(e) {
    const picked = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...picked]);
    // reset so the same file can be selected again
    e.target.value = '';
  }

  function removeFile(index) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);
    const envUrl = import.meta.env.VITE_API_URL || '';
    const apiUrl = envUrl.replace(/\/+$/, ''); // remove trailing slashes

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('priority', priority);
      formData.append('clientId', socketId || 'unknown');

      try {
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();

        if (!result.success) {
          console.error('Upload failed for', file.name, result.error);
        }
      } catch (err) {
        console.error('Network error uploading', file.name, err);
      }
    }

    setSelectedFiles([]);
    setUploading(false);
  }

  return (
    <div className="uploader-panel">
      <h2>Upload CSV Files</h2>

      <div
        className={`drop-zone ${dragActive ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-icon">📄</div>
        <p>Drag & drop CSV files here</p>
        <p className="drop-hint">or click to browse</p>
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileInput}
          accept=".csv"
          multiple
          hidden
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h3>Selected Files ({selectedFiles.length})</h3>
          <ul>
            {selectedFiles.map((file, idx) => (
              <li key={idx}>
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  className="remove-btn"
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="priority-select">
        <label>Priority:</label>
        <div className="priority-toggle">
          <button
            className={`priority-btn ${priority === 'low' ? 'active low' : ''}`}
            onClick={() => setPriority('low')}
          >
            Low
          </button>
          <button
            className={`priority-btn ${priority === 'high' ? 'active high' : ''}`}
            onClick={() => setPriority('high')}
          >
            High
          </button>
        </div>
      </div>

      <button
        className="upload-btn"
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || uploading}
      >
        {uploading
          ? 'Uploading...'
          : `Upload${selectedFiles.length > 0 ? ` (${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})` : ''}`
        }
      </button>
    </div>
  );
}

export default FileUploader;
