import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MultiImageUpload = ({ value = [], onChange, bucketName = 'repairs', folderPath = '', label, placeholder }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const images = Array.isArray(value) ? value : (value ? [value] : []);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Şəkil seçilməyib.');
      }

      // Allow multiple files
      const files = Array.from(event.target.files);
      const newUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        newUrls.push(data.publicUrl);
      }
      
      onChange([...images, ...newUrls]);
      toast.success('Şəkil yükləndi');
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      // Reset input values so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = (e, indexToRemove) => {
    e.stopPropagation();
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>}
      
      <div className="space-y-4">
        {/* Render existing images as a grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img src={img} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={(e) => removeImage(e, idx)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Sil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button Area */}
        <div className="relative group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden">
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-sm font-medium text-gray-500">Yüklənir...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">{placeholder || (images.length > 0 ? 'Daha çox şəkil əlavə et' : 'Şəkil əlavə et')}</p>
                <p className="text-xs text-gray-400 mb-3">PNG, JPG (max 5MB)</p>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-gray-500" />
                    Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    Qalereya
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          <input
            type="file"
            multiple
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            disabled={uploading}
          />
        </div>
      </div>
    </div>
  );
};

export default MultiImageUpload;
