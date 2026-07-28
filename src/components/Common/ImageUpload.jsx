import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ImageUpload = ({ value, onChange, bucketName = 'repairs', folderPath = '', label, placeholder }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // Ensure we compress/resize if needed in the future, but for now just upload
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      
      onChange(data.publicUrl);
      toast.success('Şəkil yükləndi' /* Image uploaded */);
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>}
      
      <div className="relative group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden">
        
        {value ? (
          <div className="relative aspect-video w-full flex items-center justify-center">
            <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-gray-900 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                title="Dəyiş"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={removeImage}
                className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                title="Sil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-sm font-medium text-gray-500">Yüklənir...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">{placeholder || 'Şəkil əlavə et'}</p>
                <p className="text-xs text-gray-400 mb-4">PNG, JPG (max 5MB)</p>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-gray-500" />
                    Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    Qalereya
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
        />
        <input
          type="file"
          ref={cameraInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
    </div>
  );
};

export default ImageUpload;
