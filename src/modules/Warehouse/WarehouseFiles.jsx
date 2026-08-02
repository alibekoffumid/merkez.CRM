import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { Upload, File, FileText, Image as ImageIcon, Download, Trash2, Loader2, X, FileSpreadsheet, FileArchive, Folder, FolderPlus, ArrowLeft, MoveRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseFiles = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'file' | 'folder', item: object }
  const [deleting, setDeleting] = useState(false);
  
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [fileToMove, setFileToMove] = useState(null);
  const [movingFile, setMovingFile] = useState(false);
  const [selectedMoveFolder, setSelectedMoveFolder] = useState(null); // null for root, string for folder_id
  const [allFolders, setAllFolders] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
      fetchAllFolders();
    }
  }, [profile, currentFolder]);

  const fetchAllFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_folders')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
      if (!error) {
        setAllFolders(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Subfolders
      let folderQuery = supabase
        .from('warehouse_folders')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
        
      if (currentFolder) {
        folderQuery = folderQuery.eq('parent_id', currentFolder.id);
      } else {
        folderQuery = folderQuery.is('parent_id', null);
      }
      const { data: folderData, error: folderError } = await folderQuery;
      if (folderError) throw folderError;
      setFolders(folderData || []);

      // Fetch Files
      let fileQuery = supabase
        .from('warehouse_files')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (currentFolder) {
        fileQuery = fileQuery.eq('folder_id', currentFolder.id);
      } else {
        fileQuery = fileQuery.is('folder_id', null);
      }

      const { data: fileData, error: fileError } = await fileQuery;
      if (fileError) throw fileError;
      setFiles(fileData || []);
    } catch (err) {
      toast.error('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('warehouse-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('warehouse-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('warehouse_files')
        .insert([{
          name: file.name,
          file_url: publicUrl,
          file_path: filePath,
          size: file.size,
          type: file.type,
          user_id: profile.id,
          folder_id: currentFolder ? currentFolder.id : null
        }]);

      if (dbError) throw dbError;

      toast.success(i18n.language === 'az' ? 'Fayl yükləndi' : 'Файл загружен');
      fetchData();
    } catch (err) {
      toast.error('Error uploading file: ' + err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const { error } = await supabase
        .from('warehouse_folders')
        .insert([{
          name: newFolderName.trim(),
          user_id: profile.id,
          parent_id: currentFolder ? currentFolder.id : null
        }]);
        
      if (error) throw error;
      toast.success(i18n.language === 'az' ? 'Qovluq yaradıldı' : 'Папка создана');
      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchData();
      fetchAllFolders();
    } catch (err) {
      toast.error('Error creating folder: ' + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'file') {
        const { error: storageError } = await supabase.storage
          .from('warehouse-files')
          .remove([confirmDelete.item.file_path]);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase
          .from('warehouse_files')
          .delete()
          .eq('id', confirmDelete.item.id);
        if (dbError) throw dbError;
        
        toast.success(i18n.language === 'az' ? 'Fayl silindi' : 'Файл удален');
      } else if (confirmDelete.type === 'folder') {
        const { error: dbError } = await supabase
          .from('warehouse_folders')
          .delete()
          .eq('id', confirmDelete.item.id);
        if (dbError) throw dbError;
        
        toast.success(i18n.language === 'az' ? 'Qovluq silindi' : 'Папка удалена');
      }

      setConfirmDelete(null);
      fetchData();
      if (confirmDelete.type === 'folder') fetchAllFolders();
    } catch (err) {
      toast.error('Error deleting: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveFile = async () => {
    if (!fileToMove) return;
    setMovingFile(true);
    try {
      const { error } = await supabase
        .from('warehouse_files')
        .update({ folder_id: selectedMoveFolder === 'root' ? null : selectedMoveFolder })
        .eq('id', fileToMove.id);
        
      if (error) throw error;
      toast.success(i18n.language === 'az' ? 'Fayl köçürüldü' : 'Файл перемещен');
      setShowMoveModal(false);
      setFileToMove(null);
      setSelectedMoveFolder(null);
      fetchData();
    } catch (err) {
      toast.error('Error moving file: ' + err.message);
    } finally {
      setMovingFile(false);
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
      <div className="flex justify-end p-4 bg-white border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{i18n.language === 'az' ? 'Qovluq yarat' : 'Создать папку'}</span>
          </button>
          
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
        ) : (
          <div className="flex flex-col gap-4">
            {currentFolder && (
               <button
                 onClick={() => setCurrentFolder(null)} // If nested, we'd find parent. But here we just go to root for simplicity or track hierarchy.
                 className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-merkez-blue transition-colors self-start mb-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
               >
                 <ArrowLeft className="w-4 h-4" /> {i18n.language === 'az' ? 'Geriyə (Əsas Qovluq)' : 'Назад (Корень)'}
               </button>
            )}
            
            {folders.length === 0 && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 gap-4 p-10 border-2 border-dashed border-gray-100 rounded-xl w-full">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                  <Folder className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-500 text-center">
                  {i18n.language === 'az' ? 'Bu qovluq boşdur.' : 'Эта папка пуста.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Render Folders First */}
                {folders.map(folder => (
                  <div key={folder.id} onClick={() => setCurrentFolder(folder)} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-merkez-blue hover:shadow-md transition-all group bg-white cursor-pointer">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Folder className="w-5 h-5 text-merkez-blue" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-gray-900 truncate" title={folder.name}>
                          {folder.name}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {new Date(folder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'folder', item: folder }); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Render Files */}
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
                    
                    <div className="flex items-center gap-1 pl-2 opacity-0 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setFileToMove(file); setShowMoveModal(true); setSelectedMoveFolder('root'); }}
                        className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title={i18n.language === 'az' ? 'Köçür' : 'Переместить'}
                      >
                        <MoveRight className="w-4 h-4" />
                      </button>
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
                        onClick={() => setConfirmDelete({ type: 'file', item: file })}
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
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setShowNewFolderModal(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{i18n.language === 'az' ? 'Yeni Qovluq' : 'Новая папка'}</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder={i18n.language === 'az' ? 'Qovluq adı' : 'Имя папки'}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue mb-6"
                autoFocus
              />
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex-1 py-2.5 border border-gray-150 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="flex-1 py-2.5 bg-merkez-blue text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FolderPlus className="w-4 h-4 mr-2" />}
                  {i18n.language === 'az' ? 'Yarat' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Move File Modal */}
      {showMoveModal && fileToMove && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setShowMoveModal(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{i18n.language === 'az' ? 'Faylı Köçür' : 'Переместить файл'}</h3>
              <p className="text-xs text-gray-500 font-bold mb-4 truncate">"{fileToMove.name}"</p>
              
              <div className="max-h-60 overflow-y-auto mb-6 border border-gray-100 rounded-lg">
                 <button
                    onClick={() => setSelectedMoveFolder('root')}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors ${selectedMoveFolder === 'root' ? 'bg-blue-50 text-merkez-blue' : 'hover:bg-gray-50 text-gray-700'}`}
                 >
                    <Folder className="w-4 h-4" /> {i18n.language === 'az' ? 'Əsas qovluq (Kök)' : 'Корневая папка'}
                 </button>
                 {allFolders.map(f => (
                   <button
                     key={f.id}
                     onClick={() => setSelectedMoveFolder(f.id)}
                     className={`w-full text-left px-4 py-3 border-t border-gray-50 text-sm font-bold flex items-center gap-2 transition-colors ${selectedMoveFolder === f.id ? 'bg-blue-50 text-merkez-blue' : 'hover:bg-gray-50 text-gray-700'}`}
                   >
                     <Folder className="w-4 h-4" /> {f.name}
                   </button>
                 ))}
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 py-2.5 border border-gray-150 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleMoveFile}
                  disabled={movingFile || !selectedMoveFolder}
                  className="flex-1 py-2.5 bg-merkez-blue text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {movingFile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MoveRight className="w-4 h-4 mr-2" />}
                  {i18n.language === 'az' ? 'Köçür' : 'Переместить'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

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
                  {i18n.language === 'az' ? 'Silmək' : 'Удалить'}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {i18n.language === 'az' 
                    ? `"${confirmDelete.item.name}" adlı ${confirmDelete.type === 'folder' ? 'qovluğu' : 'faylı'} silmək istədiyinizdən əminsiniz?`
                    : `Вы уверены, что хотите удалить ${confirmDelete.type === 'folder' ? 'папку' : 'файл'} "${confirmDelete.item.name}"?`}
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
