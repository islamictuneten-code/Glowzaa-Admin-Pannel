import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Check, Camera, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import { uploadProductPhoto, parsePhotoUrl } from '../../services/storageService';

interface ProductImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  sku?: string;
  label?: string;
}

const DEFAULT_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80',
];

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  value,
  onChange,
  sku = 'PROD',
  label = 'Product Photo / Image'
}) => {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await uploadProductPhoto(file, sku);
      if (res.success && (res.downloadUrl || res.downloadURL)) {
        onChange(res.downloadUrl || res.downloadURL || '');
      } else {
        setUploadError(res.error || 'Failed to upload photo. Please check format/size.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error uploading product image.');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const displayUrl = parsePhotoUrl(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} <span className="text-rose-600">*</span>
        </label>
        
        {/* Toggle Mode: Upload vs URL */}
        <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              mode === 'upload' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3 h-3 text-rose-600" />
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              mode === 'url' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3 h-3 text-slate-500" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Mode 1: Direct File Upload */}
      {mode === 'upload' && (
        <div>
          {displayUrl ? (
            /* Selected Photo Preview Card */
            <div className="relative border-2 border-slate-200 rounded-2xl p-3 bg-white flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src={displayUrl}
                  alt="Product preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
                  <Check className="w-3 h-3" />
                </div>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Photo Attached</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                  {displayUrl.startsWith('data:') ? 'Compressed Uploaded Image (Ready for Save)' : displayUrl}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-rose-600" />
                    <span>Change Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-rose-500 bg-rose-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-rose-400 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              {isUploading ? (
                <div className="py-3 flex flex-col items-center justify-center gap-2 text-rose-600">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-bold text-slate-800">Uploading & Optimizing Product Photo...</span>
                  <span className="text-[11px] text-slate-500">Auto-compressing image size for fast catalog loading</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100/70 text-rose-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Click to Upload or Drag & Drop Product Photo
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports PNG, JPG, JPEG, WebP (Max 5MB) • Auto-compressed
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs mt-1">
                    <Camera className="w-3.5 h-3.5 text-rose-600" />
                    <span>Choose File from Device / Camera</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Mode 2: Direct Image URL */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/product-photo.jpg"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            {displayUrl && (
              <img
                src={displayUrl}
                alt="Preview"
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Preset Samples */}
      <div className="pt-1 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Sample Presets:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {DEFAULT_SAMPLE_PHOTOS.map((sampleUrl, idx) => (
            <button
              key={`sample-photo-${idx}`}
              type="button"
              onClick={() => {
                setUploadError(null);
                onChange(sampleUrl);
              }}
              className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                value === sampleUrl ? 'border-rose-600 scale-110 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
              title={`Sample Preset ${idx + 1}`}
            >
              <img src={sampleUrl} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
