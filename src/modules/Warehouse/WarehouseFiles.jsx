import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { Upload, File, FileText, Image as ImageIcon, Download, Trash2, Loader2, X, FileSpreadsheet, FileArchive, Folder } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseFiles = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchFiles();
    }
  }, [profile]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_files')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      toast.error('Error fetching files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check size limit (e.g., 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error(i18n.language === 'az' ? 'Fayl həcmi 50MB-dan az olmalıdır' : 'Размер файла должен быть меньше 50МБ');
      return;
    }

    setUploading(true);
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('warehouse-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('warehouse-files')
        .getPublicUrl(filePath);

      // Insert record to database
      const { error: dbError } = await supabase
        .from('warehouse_files')
        .insert([{
          name: file.name,
          file_url: publicUrl,
          file_path: filePath,
          size: file.size,
          type: file.type,
          user_id: profile.id
        }]);

      if (dbError) throw dbError;

      toast.success(i18n.language === 'az' ? 'Fayl yükləndi' : 'Файл загружен');
      fetchFiles();
    } catch (err) {
      toast.error('Error uploading file: ' + err.message);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('warehouse-files')
        .remove([confirmDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('warehouse_files')
        .delete()
        .eq('id', confirmDelete.id);

      if (dbError) throw dbError;

      toast.success(i18n.language === 'az' ? 'Fayl silindi' : 'Файл удален');
      setConfirmDelete(null);
      fetchFiles();
    } catch (err) {
      toast.error('Error deleting file: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (!type) return <File className="w-5 h-5 text-gray-400" />;
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-wide flex items-center gap-2">
            <Folder className="w-5 h-5 text-merkez-blue" />
            {i18n.language === 'az' ? 'Fayllar və Sənədlər' : 'Файлы и Документы'}
          </h2>
          <p className="text-xs font-bold text-gray-500 mt-1">
            {i18n.language === 'az' ? 'Faktura, müqavilə və digər sənədlərinizi burada saxlayın.' : 'Храните ваши фактуры, договоры и другие документы здесь.'}
          </p>
        </div>
        
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-md ${
              uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-merkez-blue hover:bg-blue-600 shadow-blue-600/20 cursor-pointer'
            }`}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? (i18n.language === 'az' ? 'Yüklənir...' : 'Загрузка...') : (i18n.language === 'az' ? 'Fayl yüklə' : 'Загрузить файл')}
          </label>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-auto bg-white p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-merkez-blue" />
            <p className="font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 p-10 border-2 border-dashed border-gray-100 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <File className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-500 text-center">
              {i18n.language === 'az' ? 'Hələ heç bir fayl yüklənməyib.' : 'Файлы еще не загружены.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-merkez-blue hover:shadow-md transition-all group bg-white">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                      {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                    title={i18n.language === 'az' ? 'Yüklə / Bax' : 'Скачать / Посмотреть'}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setConfirmDelete(file)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {i18n.language === 'az' ? 'Faylı silmək' : 'Удалить файл'}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {i18n.language === 'az' 
                    ? `"${confirmDelete.name}" adlı faylı silmək istədiyinizdən əminsiniz?`
                    : `Вы уверены, что хотите удалить файл "${confirmDelete.name}"?`}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 border border-gray-150 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {i18n.language === 'az' ? 'Sil' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default WarehouseFiles;
