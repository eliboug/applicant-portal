import { useEffect, useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import styles from './PDFViewer.module.css';

interface PDFViewerProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

export function PDFViewer({ url, fileName, onClose }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [url]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{fileName}</h3>
          <div className={styles.controls}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              title="Download"
            >
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInNewTab}
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading PDF...</p>
            </div>
          )}
          <iframe
            src={url}
            className={styles.iframe}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            title={fileName}
          />
        </div>
      </div>
    </div>
  );
}
