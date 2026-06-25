import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import '@excalidraw/excalidraw/index.css';

const MermaidView = ({ initialMermaidCode }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useEffect(() => {
    const loadMermaid = async () => {
      if (excalidrawAPI && initialMermaidCode) {
        try {
          const { elements, files } = await parseMermaidToExcalidraw(initialMermaidCode, {
            fontSize: 20,
          });
          excalidrawAPI.updateScene({
            elements,
            appState: { viewBackgroundColor: '#ffffff' }
          });
          excalidrawAPI.scrollToContent(elements, { fitToContent: true });
        } catch (err) {
          console.error("Error parsing mermaid for excalidraw:", err);
        }
      }
    };
    loadMermaid();
  }, [excalidrawAPI, initialMermaidCode]);

  return (
    <div className="view-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexGrow: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <Excalidraw 
          excalidrawAPI={(api) => setExcalidrawAPI(api)} 
          initialData={{
            appState: { viewBackgroundColor: '#ffffff' }
          }}
        />
      </div>
    </div>
  );
};

export default MermaidView;
