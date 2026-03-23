import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Move } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="relative h-full bg-slate-900 rounded-2xl overflow-hidden flex flex-col">
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <ControlButton onClick={handleZoomIn} icon={<ZoomIn className="w-5 h-5" />} label="Zoom In" />
        <ControlButton onClick={handleZoomOut} icon={<ZoomOut className="w-5 h-5" />} label="Zoom Out" />
        <ControlButton onClick={handleRotate} icon={<RotateCw className="w-5 h-5" />} label="Rotate" />
        <ControlButton onClick={() => setZoom(1)} icon={<Maximize2 className="w-5 h-5" />} label="Reset" />
      </div>

      <div className="flex-1 relative overflow-auto flex items-center justify-center p-8 cursor-move">
        <div 
          className="transition-transform duration-200 ease-out origin-center"
          style={{ 
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img 
            src={src} 
            alt="Clinical Record" 
            className="max-w-full h-auto shadow-2xl rounded-sm"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <div className="p-4 bg-slate-800/50 backdrop-blur-md border-t border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-400">
          <Move className="w-4 h-4" />
          <span className="text-xs font-medium">Click and drag to pan (simulated)</span>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
          Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}°
        </div>
      </div>
    </div>
  );
};

function ControlButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 bg-slate-800/80 hover:bg-indigo-600 text-white rounded-xl backdrop-blur-md border border-slate-700 transition-all shadow-lg group relative"
    >
      {icon}
      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </button>
  );
}
