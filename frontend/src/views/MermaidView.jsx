import React, { useState, useEffect } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Save } from 'lucide-react';
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

  const handleExportCustom = async () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    if (!elements || !elements.length) return;
    
    try {
      const blob = await exportToBlob({
        elements,
        appState: {
          exportBackground: true,
          viewBackgroundColor: '#ffffff'
        },
        files: excalidrawAPI.getFiles(),
      });
      
      const fileName = `Diagrama_NoxusMD_${Date.now()}.png`;
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result;
          
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64data,
            directory: Directory.Cache
          });
          
          await Share.share({
            title: 'Exportar Diagrama',
            url: savedFile.uri,
            dialogTitle: 'Guardar o Compartir Imagen'
          });
        };
      } else {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: fileName,
            });
            return;
          } catch (err) {
            console.error("Web share failed", err);
            if (err.name !== 'AbortError') {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error("Error al exportar:", err);
      alert("Hubo un error al guardar la imagen.");
    }
  };

  return (
    <div className="view-container mermaid-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexGrow: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <Excalidraw 
          excalidrawAPI={(api) => setExcalidrawAPI(api)} 
          initialData={{
            appState: { viewBackgroundColor: '#ffffff' }
          }}
        />
        
        <button 
          onClick={handleExportCustom}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            backgroundColor: 'var(--primary, #6d28d9)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }}
          title="Guardar como PNG (Compartir/Descargar)"
        >
          <Save size={24} />
        </button>
      </div>
    </div>
  );
};

export default MermaidView;
