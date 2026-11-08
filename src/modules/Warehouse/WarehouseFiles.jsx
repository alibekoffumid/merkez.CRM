import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { 
  Search, Upload, File, FileText, Image as ImageIcon, Download, Eye, 
  Trash2, Loader2, X, FileSpreadsheet, FileArchive, Folder, FolderPlus, 
  ArrowLeft, MoveRight, Maximize2, Minimize2, ZoomIn, Save, Plus, Check 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import ModalPortal from '../../components/Common/ModalPortal';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Parser } from 'hot-formula-parser';

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
  const [allFiles, setAllFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [activeSheetData, setActiveSheetData] = useState(null);
  const [focusedCell, setFocusedCell] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  const excelWorkbookRef = useRef(null);
  const sheetJsWorkbookRef = useRef(null);
  const blobUrlsRef = useRef([]);

  const getColumnLetter = (colIndex) => {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const cleanupBlobUrls = () => {
    if (blobUrlsRef.current && blobUrlsRef.current.length > 0) {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
      blobUrlsRef.current = [];
    }
  };

  const parseSheetData = (excelWb, sheetJsWb, sheetIdx) => {
    cleanupBlobUrls();
    const ws = excelWb?.worksheets?.[sheetIdx] || excelWb?.worksheets?.[0];
    if (!ws) return null;

    const sheetName = ws.name;
    const sheetJsWs = sheetJsWb?.Sheets?.[sheetName] || (sheetJsWb?.SheetNames && sheetJsWb.Sheets[sheetJsWb.SheetNames[sheetIdx]]) || null;

    // 1. Gather all merges
    const mergeMap = {};
    if (Array.isArray(ws.model?.merges)) {
      ws.model.merges.forEach(rangeStr => {
        if (typeof rangeStr === 'string' && rangeStr.includes(':')) {
          const [tlAddr, brAddr] = rangeStr.split(':');
          const tlCell = ws.getCell(tlAddr);
          const brCell = ws.getCell(brAddr);
          mergeMap[tlCell.address] = {
            top: tlCell.row,
            left: tlCell.col,
            bottom: brCell.row,
            right: brCell.col,
            rowSpan: brCell.row - tlCell.row + 1,
            colSpan: brCell.col - tlCell.col + 1
          };
        }
      });
    } else if (ws._merges) {
      Object.keys(ws._merges).forEach(masterKey => {
        const m = ws._merges[masterKey]?.model;
        if (m) {
          mergeMap[masterKey] = {
            top: m.top,
            left: m.left,
            bottom: m.bottom,
            right: m.right,
            rowSpan: m.bottom - m.top + 1,
            colSpan: m.right - m.left + 1
          };
        }
      });
    }

    // 2. Gather images
    const imagesByAddress = {};
    const createdBlobUrls = [];
    const rawImages = typeof ws.getImages === 'function' ? ws.getImages() : [];

    rawImages.forEach(img => {
      try {
        const imgData = excelWb.getImage(img.imageId);
        if (!imgData || !imgData.buffer) return;

        const blob = new Blob([imgData.buffer], { type: `image/${imgData.extension || 'png'}` });
        const url = URL.createObjectURL(blob);
        createdBlobUrls.push(url);

        let anchorR = 1;
        let anchorC = 1;
        if (typeof img.range === 'string') {
          const tlAddr = img.range.split(':')[0];
          const cell = ws.getCell(tlAddr);
          anchorR = cell.row;
          anchorC = cell.col;
        } else if (img.range?.tl) {
          const tl = img.range.tl;
          const r = tl.nativeRow !== undefined ? tl.nativeRow : (tl.row !== undefined ? tl.row : 0);
          const c = tl.nativeCol !== undefined ? tl.nativeCol : (tl.col !== undefined ? tl.col : 0);
          anchorR = Math.floor(r) + 1;
          anchorC = Math.floor(c) + 1;
        }

        const targetCell = ws.getCell(anchorR, anchorC);
        let masterAddr = targetCell.address;
        if (targetCell.isMerged && targetCell.master) {
          masterAddr = targetCell.master.address;
        }

        if (!imagesByAddress[masterAddr]) {
          imagesByAddress[masterAddr] = [];
        }
        imagesByAddress[masterAddr].push({
          url,
          extension: imgData.extension,
          name: imgData.name || 'Image'
        });
      } catch (err) {
        console.warn('Failed to extract image:', err);
      }
    });

    blobUrlsRef.current = createdBlobUrls;

    // 3. Determine dimensions
    let maxRow = ws.rowCount || 0;
    let maxCol = ws.columnCount || 0;

    Object.values(mergeMap).forEach(m => {
      if (m.bottom > maxRow) maxRow = m.bottom;
      if (m.right > maxCol) maxCol = m.right;
    });

    rawImages.forEach(img => {
      if (img.range?.br) {
        const brR = (img.range.br.nativeRow !== undefined ? img.range.br.nativeRow : img.range.br.row || 0) + 1;
        const brC = (img.range.br.nativeCol !== undefined ? img.range.br.nativeCol : img.range.br.col || 0) + 1;
        if (brR > maxRow) maxRow = brR;
        if (brC > maxCol) maxCol = brC;
      }
      if (img.range?.tl) {
        const tlR = (img.range.tl.nativeRow !== undefined ? img.range.tl.nativeRow : img.range.tl.row || 0) + 1;
        const tlC = (img.range.tl.nativeCol !== undefined ? img.range.tl.nativeCol : img.range.tl.col || 0) + 1;
        if (tlR > maxRow) maxRow = tlR;
        if (tlC > maxCol) maxCol = tlC;
      }
    });

    if (sheetJsWs && sheetJsWs['!ref']) {
      try {
        const decoded = XLSX.utils.decode_range(sheetJsWs['!ref']);
        if (decoded.e.r + 1 > maxRow) maxRow = decoded.e.r + 1;
        if (decoded.e.c + 1 > maxCol) maxCol = decoded.e.c + 1;
      } catch (e) {}
    }

    maxRow = Math.max(maxRow, 22);
    maxCol = Math.max(maxCol, 10);

    // 4. Build rows and cells
    const rows = [];
    for (let r = 1; r <= maxRow; r++) {
      const rowCells = [];
      const excelRow = ws.getRow(r);
      const rowHeight = excelRow.height ? Math.round(excelRow.height * 1.33) : undefined;

      for (let c = 1; c <= maxCol; c++) {
        const cell = ws.getCell(r, c);
        const isMerged = !!cell.isMerged;
        const isMaster = !isMerged || !cell.master || cell.address === cell.master.address;

        if (!isMaster) {
          rowCells.push({
            address: cell.address,
            row: r,
            col: c,
            isMerged: true,
            isMaster: false
          });
          continue;
        }

        const mergeInfo = mergeMap[cell.address];
        const rowSpan = mergeInfo?.rowSpan || 1;
        const colSpan = mergeInfo?.colSpan || 1;

        let formula = '';
        let rawVal = cell.value;
        let displayVal = '';

        if (rawVal && typeof rawVal === 'object') {
          if (rawVal.formula) {
            formula = '=' + rawVal.formula;
            displayVal = rawVal.result !== undefined && rawVal.result !== null ? String(rawVal.result) : '';
          } else if (rawVal.sharedFormula) {
            formula = '=' + (rawVal.formula || rawVal.sharedFormula);
            displayVal = rawVal.result !== undefined && rawVal.result !== null ? String(rawVal.result) : '';
          } else if (rawVal.richText) {
            displayVal = cell.text || rawVal.richText.map(t => t.text).join('');
          } else if (rawVal instanceof Date) {
            displayVal = rawVal.toLocaleDateString();
          } else if (rawVal.text) {
            displayVal = rawVal.text;
          }
        } else if (rawVal !== undefined && rawVal !== null) {
          displayVal = String(rawVal);
        }

        const sCell = sheetJsWs ? sheetJsWs[cell.address] : null;
        if (sCell) {
          if (sCell.w) {
            displayVal = sCell.w;
          } else if (sCell.v !== undefined && sCell.v !== null && !displayVal) {
            displayVal = String(sCell.v);
          }
          if (sCell.f && !formula) {
            formula = '=' + sCell.f;
          }
        }

        if (!displayVal && cell.text) {
          displayVal = cell.text;
        }

        const style = {};
        if (cell.font) {
          if (cell.font.bold) style.fontWeight = 'bold';
          if (cell.font.italic) style.fontStyle = 'italic';
          if (cell.font.size) style.fontSize = `${Math.max(11, Math.min(22, cell.font.size))}px`;
          if (cell.font.color?.argb) {
            style.color = '#' + cell.font.color.argb.slice(-6);
          }
        }

        if (cell.alignment) {
          if (cell.alignment.horizontal) {
            style.textAlign = cell.alignment.horizontal;
          }
          if (cell.alignment.vertical) {
            style.verticalAlign = cell.alignment.vertical === 'middle' ? 'middle' : cell.alignment.vertical;
          }
          if (cell.alignment.wrapText) {
            style.whiteSpace = 'pre-wrap';
            style.wordBreak = 'break-word';
          }
        }

        if (cell.fill?.type === 'pattern' && cell.fill.fgColor?.argb) {
          const hex = cell.fill.fgColor.argb.slice(-6).toLowerCase();
          if (hex !== 'ffffff' && hex !== '000000') {
            style.backgroundColor = '#' + hex;
          }
        }

        const cellImages = imagesByAddress[cell.address] || [];

        rowCells.push({
          address: cell.address,
          row: r,
          col: c,
          isMerged,
          isMaster: true,
          rowSpan,
          colSpan,
          rawVal,
          formula,
          displayVal,
          images: cellImages,
          style,
          height: rowHeight
        });
      }

      rows.push({
        rowNumber: r,
        height: rowHeight,
        cells: rowCells
      });
    }

    // 5. Build columns
    const columns = [];
    for (let c = 1; c <= maxCol; c++) {
      const excelCol = ws.getColumn(c);
      const width = excelCol.width ? Math.round(excelCol.width * 8.5) : undefined;
      columns.push({
        colNumber: c,
        letter: getColumnLetter(c - 1),
        width
      });
    }

    return {
      name: sheetName,
      sheetIndex: sheetIdx,
      rowCount: maxRow,
      colCount: maxCol,
      rows,
      columns,
      imagesByAddress
    };
  };

  useEffect(() => {
    if (profile?.id) {
      fetchData();
      fetchAllFoldersAndFiles();
    }
  }, [profile, currentFolder]);

  const fetchAllFoldersAndFiles = async () => {
    try {
      const { data: folderData, error: folderError } = await supabase
        .from('warehouse_folders')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
      if (!folderError) setAllFolders(folderData || []);

      const { data: fileData, error: fileError } = await supabase
        .from('warehouse_files')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
      if (!fileError) setAllFiles(fileData || []);
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
      const rawExt = String(file?.name || '').split('.').pop()?.toLowerCase();
      const ALLOWED_EXTS = ['xlsx', 'xls', 'csv', 'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt'];
      const fileExt = ALLOWED_EXTS.find(ext => ext === rawExt) || 'bin';
      const safeUserId = String(profile?.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
      const safeRand = Math.random().toString(36).substring(2, 10).replace(/[^a-z0-9]/g, '');
      const fileName = `${Date.now()}_${safeRand}.${fileExt}`;
      const filePath = `${safeUserId}/${fileName}`;

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
      fetchAllFoldersAndFiles();
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
      if (confirmDelete.type === 'folder') fetchAllFoldersAndFiles();
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

  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewSearch('');
    setPreviewLoading(true);
    setFocusedCell(null);
    try {
      let arrayBuffer = null;
      let path = file?.file_path;
      if (!path && file?.file_url) {
        const parts = String(file.file_url).split('/warehouse-files/');
        if (parts.length > 1) {
          path = decodeURIComponent(parts[1].split('?')[0]);
        }
      }

      if (path) {
        const cleanPath = String(path).replace(/\.\./g, '').replace(/^\/+/, '');
        const { data: blobData, error: dlError } = await supabase.storage
          .from('warehouse-files')
          .download(cleanPath);

        if (!dlError && blobData) {
          arrayBuffer = await blobData.arrayBuffer();
        } else if (dlError) {
          console.warn('Supabase storage download error:', dlError);
        }
      }

      if (!arrayBuffer) {
        throw new Error(i18n.language === 'az' ? 'Fayl yüklənə bilmədi' : 'Не удалось загрузить файл');
      }

      // Load with ExcelJS
      const excelWb = new ExcelJS.Workbook();
      await excelWb.xlsx.load(arrayBuffer);
      excelWorkbookRef.current = excelWb;

      // Load with SheetJS
      let sheetJsWb = null;
      try {
        sheetJsWb = XLSX.read(arrayBuffer, { 
          type: 'array', 
          cellFormula: true, 
          cellStyles: true, 
          cellNF: true, 
          cellText: true 
        });
      } catch (e) {
        console.warn('SheetJS read fallback warning:', e);
      }
      sheetJsWorkbookRef.current = sheetJsWb;

      const names = excelWb.worksheets.map(w => w.name);
      setSheetNames(names);
      setActiveSheetIndex(0);

      const parsed = parseSheetData(excelWb, sheetJsWb, 0);
      setActiveSheetData(parsed);
    } catch (err) {
      console.error('Error previewing file:', err);
      toast.error('Error previewing file: ' + err.message);
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSelectSheet = (idx) => {
    if (!excelWorkbookRef.current) return;
    setActiveSheetIndex(idx);
    setFocusedCell(null);
    const parsed = parseSheetData(excelWorkbookRef.current, sheetJsWorkbookRef.current, idx);
    setActiveSheetData(parsed);
  };

  const handleClosePreview = () => {
    cleanupBlobUrls();
    setPreviewFile(null);
    setActiveSheetData(null);
    setSheetNames([]);
    setActiveSheetIndex(0);
    setFocusedCell(null);
    setLightboxImage(null);
    setIsFullscreen(false);
    setHasUnsavedChanges(false);
    setSavingFile(false);
  };

  const focusCellAt = (targetRow, targetCol) => {
    if (!activeSheetData) return;
    const r = Math.max(1, Math.min(activeSheetData.rowCount, targetRow));
    const c = Math.max(1, Math.min(activeSheetData.colCount, targetCol));

    const rowObj = activeSheetData.rows.find(row => row.rowNumber === r);
    if (rowObj) {
      let cellObj = rowObj.cells.find(cell => cell.col === c);
      if (cellObj && !cellObj.isMaster) {
        if (excelWorkbookRef.current) {
          const ws = excelWorkbookRef.current.worksheets[activeSheetIndex] || excelWorkbookRef.current.worksheets[0];
          const rawCell = ws.getCell(r, c);
          if (rawCell.master) {
            const masterAddr = rawCell.master.address;
            for (const ro of activeSheetData.rows) {
              const found = ro.cells.find(ce => ce.address === masterAddr);
              if (found) { cellObj = found; break; }
            }
          }
        }
      }
      if (cellObj) {
        setFocusedCell(cellObj);
      }
    }
  };

  const handleCellKeyDown = (e, cell) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusCellAt(cell.row + (cell.rowSpan || 1), cell.col);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        focusCellAt(cell.row, cell.col - 1);
      } else {
        focusCellAt(cell.row, cell.col + (cell.colSpan || 1));
      }
    } else if (e.key === 'Escape') {
      setFocusedCell(null);
    }
  };

  const handleFormulaChange = (newVal) => {
    if (!focusedCell || !activeSheetData) return;
    const { address, row, col } = focusedCell;
    setHasUnsavedChanges(true);

    const isF = newVal.startsWith('=');

    const newRows = activeSheetData.rows.map(rObj => {
      if (rObj.rowNumber !== row) return rObj;
      return {
        ...rObj,
        cells: rObj.cells.map(cObj => {
          if (cObj.address !== address) return cObj;
          return {
            ...cObj,
            formula: isF ? newVal : '',
            displayVal: newVal,
            rawVal: newVal
          };
        })
      };
    });

    setActiveSheetData({
      ...activeSheetData,
      rows: newRows
    });

    setFocusedCell(prev => ({
      ...prev,
      formula: isF ? newVal : '',
      displayVal: newVal,
      rawVal: newVal
    }));

    if (excelWorkbookRef.current) {
      const ws = excelWorkbookRef.current.worksheets[activeSheetIndex] || excelWorkbookRef.current.worksheets[0];
      if (ws) {
        const cell = ws.getCell(address);
        if (isF) {
          cell.value = { formula: newVal.substring(1) };
        } else if (!isNaN(Number(newVal)) && newVal.trim() !== '') {
          cell.value = Number(newVal);
        } else {
          cell.value = newVal;
        }
      }
    }
  };

  const handleAddRow = () => {
    if (!activeSheetData || !excelWorkbookRef.current) return;
    const newRowNum = activeSheetData.rowCount + 1;
    const ws = excelWorkbookRef.current.worksheets[activeSheetIndex] || excelWorkbookRef.current.worksheets[0];

    const newCells = [];
    for (let c = 1; c <= activeSheetData.colCount; c++) {
      const cell = ws.getCell(newRowNum, c);
      newCells.push({
        address: cell.address,
        row: newRowNum,
        col: c,
        isMerged: false,
        isMaster: true,
        rowSpan: 1,
        colSpan: 1,
        rawVal: '',
        formula: '',
        displayVal: '',
        images: [],
        style: {}
      });
    }

    setActiveSheetData({
      ...activeSheetData,
      rowCount: newRowNum,
      rows: [
        ...activeSheetData.rows,
        {
          rowNumber: newRowNum,
          height: 28,
          cells: newCells
        }
      ]
    });
    setHasUnsavedChanges(true);
    toast.success(i18n.language === 'az' ? 'Yeni sətir əlavə edildi' : 'Новая строка добавлена');
  };

  const handleSaveToStorage = async () => {
    if (!previewFile || !excelWorkbookRef.current) return;
    setSavingFile(true);
    try {
      const buffer = await excelWorkbookRef.current.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Overwrite/update file in Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('warehouse-files')
        .upload(previewFile.file_path, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Update size and updated_at in warehouse_files table
      await supabase
        .from('warehouse_files')
        .update({ size: blob.size, updated_at: new Date().toISOString() })
        .eq('id', previewFile.id);

      setHasUnsavedChanges(false);
      toast.success(i18n.language === 'az' ? 'Dəyişikliklər faylda yadda saxlanıldı' : 'Изменения сохранены в файле');
      fetchData();
    } catch (err) {
      console.error('Error saving file:', err);
      toast.error('Error saving: ' + err.message);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDownloadEdited = async () => {
    if (!previewFile) return;
    try {
      if (excelWorkbookRef.current) {
        const buffer = await excelWorkbookRef.current.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileNameParts = previewFile.name.split('.');
        const ext = fileNameParts.pop();
        a.download = `${fileNameParts.join('.')}_edited.${ext || 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(i18n.language === 'az' ? 'Fayl yükləndi' : 'Файл скачан');
        return;
      }
      window.open(previewFile.file_url, '_blank');
    } catch (err) {
      toast.error('Error downloading file: ' + err.message);
    }
  };

  const getFileIcon = (type) => {
    if (!type) return <File className="w-5 h-5 text-gray-400" />;
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const [portalTarget, setPortalTarget] = useState(null);
  useEffect(() => {
    setPortalTarget(document.getElementById('warehouse-actions-portal-target'));
  }, []);

  const searchResults = searchQuery.trim() ? [
    ...allFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(f => ({ ...f, type: 'folder' })),
    ...allFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(f => ({ ...f, type: 'file' }))
  ] : [];

  const searchContainerRef = useRef(null);
  const [searchCoords, setSearchCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (showSearchResults) {
      const updateCoords = () => {
        if (searchContainerRef.current) {
          const rect = searchContainerRef.current.getBoundingClientRect();
          setSearchCoords({
            top: rect.bottom + 8,
            left: rect.left,
            width: Math.max(rect.width, 288) // w-72 = 288px
          });
        }
      };
      
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [showSearchResults]);

  const headerActions = (
    <div className="flex flex-col sm:flex-row items-center gap-2 ml-auto w-full sm:w-auto sm:justify-end">
      {/* Search Bar */}
      <div className="relative z-50" ref={searchContainerRef}>
        <div className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg focus-within:border-merkez-blue focus-within:ring-2 focus-within:ring-blue-100 transition-all w-full sm:w-64 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder={i18n.language === 'az' ? 'Axtarış...' : 'Поиск...'}
            className="w-full text-sm outline-none bg-transparent"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowSearchResults(false); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Results (Portaled to avoid overflow-hidden) */}
        {showSearchResults && searchQuery.trim() && searchCoords.top > 0 && ReactDOM.createPortal(
          <div 
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2"
            style={{
              top: `${searchCoords.top}px`,
              left: `${searchCoords.left}px`,
              width: `${searchCoords.width}px`
            }}
          >
            {searchResults.length > 0 ? (
              searchResults.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    if (item.type === 'folder') {
                      setCurrentFolder(item);
                    } else {
                      if (item.folder_id) {
                        const parent = allFolders.find(f => f.id === item.folder_id);
                        setCurrentFolder(parent || null);
                      } else {
                        setCurrentFolder(null);
                      }
                    }
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                >
                  {item.type === 'folder' ? <Folder className="w-5 h-5 text-merkez-blue shrink-0" /> : <File className="w-5 h-5 text-gray-400 shrink-0" />}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-gray-800 truncate">{item.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                      {item.type === 'folder' 
                        ? (i18n.language === 'az' ? 'Qovluq' : 'Папка') 
                        : (i18n.language === 'az' ? 'Fayl' : 'Файл')}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 flex flex-col items-center justify-center text-gray-400">
                <Search className="w-6 h-6 mb-2 opacity-50" />
                <span className="text-xs font-bold">{i18n.language === 'az' ? 'Nəticə tapılmadı' : 'Ничего не найдено'}</span>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      <button
        onClick={() => setShowNewFolderModal(true)}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
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
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-md ${
          uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-merkez-blue hover:bg-blue-600 shadow-blue-600/20 cursor-pointer'
        }`}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? (i18n.language === 'az' ? 'Yüklənir...' : 'Загрузка...') : (i18n.language === 'az' ? 'Fayl yüklə' : 'Загрузить файл')}
      </label>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Full-width header toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:px-6 md:py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-merkez-blue shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {currentFolder ? currentFolder.name : (i18n.language === 'az' ? 'Fayllar və Qovluqlar' : 'Файлы и папки')}
              </h2>
              {currentFolder && (
                <span className="text-[10px] font-black uppercase tracking-wider text-merkez-blue bg-blue-50 px-2 py-0.5 rounded-md">
                  {i18n.language === 'az' ? 'Qovluq' : 'Папка'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {folders.length} {i18n.language === 'az' ? 'qovluq' : 'папок'} • {files.length} {i18n.language === 'az' ? 'fayl' : 'файлов'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {headerActions}
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-auto bg-gray-50/30 p-4 md:p-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-merkez-blue" />
            <p className="font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-full">
            {currentFolder && (
              <button
                onClick={() => setCurrentFolder(null)}
                className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-merkez-blue transition-colors self-start bg-white px-3.5 py-2 rounded-lg border border-gray-200 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {i18n.language === 'az' ? 'Əsas qovluğa qayıt' : 'Назад в корень'}
              </button>
            )}
            
            {folders.length === 0 && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[350px] text-gray-400 gap-4 p-10 border-2 border-dashed border-gray-200 rounded-2xl bg-white w-full">
                <div className="w-16 h-16 rounded-2xl bg-blue-50/50 flex items-center justify-center text-merkez-blue">
                  <FolderPlus className="w-8 h-8 opacity-70" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">
                    {i18n.language === 'az' ? 'Bu qovluqda heç bir fayl və ya alt qovluq yoxdur' : 'В этой папке нет файлов или вложенных папок'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {i18n.language === 'az' ? 'Yuxarıdakı düymələrdən istifadə edərək yeni qovluq yaradın və ya fayl yükləyin' : 'Используйте кнопки выше, чтобы создать папку или загрузить файл'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
                {/* Render Folders First */}
                {folders.map(folder => (
                  <div 
                    key={folder.id} 
                    onClick={() => setCurrentFolder(folder)} 
                    className="relative flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-merkez-blue hover:shadow-md transition-all group bg-white cursor-pointer hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-merkez-blue group-hover:scale-110 transition-transform">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 truncate block w-full whitespace-nowrap" title={folder.name}>
                          {folder.name}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate whitespace-nowrap block w-full">
                          {new Date(folder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center pl-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'folder', item: folder }); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Render Files */}
                {files.map(file => (
                  <div key={file.id} className="relative flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-merkez-blue hover:shadow-md transition-all group bg-white hover:-translate-y-0.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-500 group-hover:scale-110 transition-transform">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 truncate block w-full whitespace-nowrap" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-xs font-bold text-gray-400 mt-0.5 truncate whitespace-nowrap block w-full">
                          {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md p-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={() => { setFileToMove(file); setShowMoveModal(true); setSelectedMoveFolder('root'); }}
                        className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title={i18n.language === 'az' ? 'Köçür' : 'Переместить'}
                      >
                        <MoveRight className="w-4 h-4" />
                      </button>
                      {(file.type?.includes('spreadsheet') || file.type?.includes('excel') || file.type?.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) && (
                        <button
                          onClick={() => handlePreview(file)}
                          className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title={i18n.language === 'az' ? 'Bax' : 'Просмотр'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title={i18n.language === 'az' ? 'Yüklə' : 'Скачать'}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setConfirmDelete({ type: 'file', item: file })}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Excel Preview Modal */}
      {previewFile && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4" onClick={handleClosePreview}>
            <div 
              className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 transition-all ${
                isFullscreen ? 'w-screen h-screen rounded-none' : 'w-[98vw] max-w-[1500px] h-[92vh]'
              }`} 
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/90 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight truncate max-w-xs sm:max-w-md">{previewFile.name}</h3>
                      {hasUnsavedChanges && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          {i18n.language === 'az' ? 'Yadda saxlanılmayıb' : 'Не сохранено'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-500">{formatFileSize(previewFile.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Search within document */}
                  {activeSheetData && (
                    <div className="relative hidden sm:block">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={i18n.language === 'az' ? 'Faylın daxilində axtar...' : 'Поиск внутри файла...'}
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold w-56 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                      {previewSearch && (
                        <button onClick={() => setPreviewSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Save to System Button */}
                  <button
                    type="button"
                    onClick={handleSaveToStorage}
                    disabled={savingFile}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-50"
                    title={i18n.language === 'az' ? 'Dəyişiklikləri faylda yadda saxla' : 'Сохранить изменения в файле'}
                  >
                    {savingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{i18n.language === 'az' ? 'Yadda saxla' : 'Сохранить'}</span>
                  </button>

                  {/* Fullscreen toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
                    title={isFullscreen ? 'Kiçilt' : 'Tam ekran'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Download */}
                  <button
                    type="button"
                    onClick={handleDownloadEdited}
                    className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-xs"
                    title={i18n.language === 'az' ? 'Kompüterə yüklə' : 'Скачать на компьютер'}
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline">{i18n.language === 'az' ? 'Yüklə' : 'Скачать'}</span>
                  </button>

                  {/* Close */}
                  <button 
                    type="button"
                    onClick={handleClosePreview} 
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Formula Bar */}
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 bg-white shrink-0">
                <div className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded border border-gray-200 min-w-[3.5rem] text-center select-none shadow-2xs">
                  {focusedCell ? focusedCell.address : ''}
                </div>
                <div className="font-serif italic text-emerald-700 font-bold px-1.5 text-sm select-none">fx</div>
                <input
                  type="text"
                  className="flex-1 px-3 py-1 text-xs border border-gray-200 rounded outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 hover:bg-white focus:bg-white font-mono text-gray-800 transition-colors shadow-2xs"
                  value={focusedCell ? (focusedCell.formula || focusedCell.displayVal || '') : ''}
                  onChange={(e) => handleFormulaChange(e.target.value)}
                  disabled={!focusedCell}
                  placeholder={i18n.language === 'az' ? 'Xananı seçin və dəyər və ya düstur daxil edin...' : 'Выберите ячейку и введите значение или формулу...'}
                />
              </div>

              {/* Spreadsheet Content Area */}
              <div className="flex-1 overflow-auto bg-slate-100/60 relative custom-scrollbar">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 absolute inset-0 bg-white/80 backdrop-blur-xs">
                    <Loader2 className="w-9 h-9 animate-spin mb-3 text-emerald-600" />
                    <p className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('common.loading')}</p>
                  </div>
                ) : activeSheetData ? (
                  <div className="inline-block min-w-full align-top bg-white p-2">
                    <table className="border-collapse table-fixed text-xs bg-white shadow-xs">
                      {/* Column definitions for clean sizing */}
                      <colgroup>
                        <col style={{ width: '45px' }} />
                        {activeSheetData.columns.map(col => (
                          <col 
                            key={col.colNumber} 
                            style={{ 
                              width: col.width 
                                ? `${col.width}px` 
                                : (col.colNumber === 1 ? '150px' : '110px') 
                            }} 
                          />
                        ))}
                      </colgroup>

                      <thead>
                        <tr className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-xs border-b border-gray-300">
                          <th className="w-[45px] min-w-[45px] py-1.5 px-2 text-center font-bold border-r border-gray-300 bg-gray-100 sticky left-0 z-30 select-none text-[11px] text-gray-500">
                            #
                          </th>
                          {activeSheetData.columns.map(col => (
                            <th 
                              key={col.colNumber} 
                              className="py-1.5 px-2 text-center font-bold border-r border-gray-300 text-gray-700 select-none text-[11px] bg-gray-100"
                            >
                              {col.letter}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {activeSheetData.rows.map(row => (
                          <tr 
                            key={row.rowNumber} 
                            style={{ height: row.height ? `${row.height}px` : undefined }} 
                            className="hover:bg-slate-50/50"
                          >
                            {/* Row number sticky on the left */}
                            <td className="w-[45px] min-w-[45px] py-1 px-1 text-center font-bold text-gray-400 bg-gray-100 border-r border-b border-gray-300 sticky left-0 z-10 select-none text-[11px]">
                              {row.rowNumber}
                            </td>

                            {/* Cells in this row */}
                            {row.cells.map(cell => {
                              if (!cell.isMaster) return null; // Covered by merge

                              const isSelected = focusedCell?.address === cell.address;
                              const isSearchMatch = previewSearch.trim() && (
                                (cell.displayVal && String(cell.displayVal).toLowerCase().includes(previewSearch.toLowerCase())) ||
                                (cell.formula && cell.formula.toLowerCase().includes(previewSearch.toLowerCase()))
                              );

                              return (
                                <td
                                  key={cell.address}
                                  rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                                  colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                                  style={cell.style}
                                  onClick={() => setFocusedCell(cell)}
                                  className={`p-1.5 border-r border-b border-gray-300 relative text-gray-800 transition-colors align-top ${
                                    isSelected ? 'outline outline-2 outline-emerald-600 z-10 bg-emerald-50/30' : ''
                                  } ${isSearchMatch ? 'bg-amber-100 ring-2 ring-amber-400 font-bold' : ''}`}
                                  title={cell.formula ? `Düstur: ${cell.formula}` : undefined}
                                >
                                  {/* Cell Photos / Images */}
                                  {cell.images && cell.images.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
                                      {cell.images.map((img, imgIdx) => (
                                        <div key={imgIdx} className="group relative">
                                          <img
                                            src={img.url}
                                            alt={img.name || 'Məhsul şəkli'}
                                            className={`object-contain rounded-md shadow-xs border border-gray-200 bg-white hover:scale-105 transition-transform cursor-pointer ${
                                              cell.rowSpan > 2 ? 'max-h-36' : 'max-h-20'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setLightboxImage(img.url);
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md pointer-events-none transition-opacity">
                                            <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Text / Editable Value */}
                                  {isSelected ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={focusedCell?.formula || focusedCell?.displayVal || ''}
                                      onChange={(e) => handleFormulaChange(e.target.value)}
                                      onKeyDown={(e) => handleCellKeyDown(e, cell)}
                                      className="w-full bg-white text-gray-900 border border-emerald-500 rounded px-1.5 py-0.5 text-xs outline-none shadow-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                                      style={{
                                        textAlign: cell.style?.textAlign || 'inherit',
                                        fontWeight: cell.style?.fontWeight || 'inherit',
                                        fontSize: cell.style?.fontSize || 'inherit',
                                        color: cell.style?.color || 'inherit'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div className={`leading-snug break-words min-h-[22px] cursor-text ${cell.images?.length > 0 ? 'text-center mt-1 text-[11px]' : ''}`}>
                                      {cell.displayVal !== '' && cell.displayVal !== undefined && cell.displayVal !== null ? (
                                        cell.displayVal
                                      ) : (
                                        <span className="opacity-0 select-none">&nbsp;</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {/* Add Row Button Row */}
                        <tr>
                          <td colSpan={activeSheetData.columns.length + 1} className="p-2 bg-gray-50/50 border-t border-gray-300">
                            <button
                              type="button"
                              onClick={handleAddRow}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 border border-dashed border-gray-300 hover:border-emerald-400 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{i18n.language === 'az' ? 'Yeni sətir əlavə et' : 'Добавить строку'}</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileSpreadsheet className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-bold text-sm">{i18n.language === 'az' ? 'Məlumat oxuna bilmədi' : 'Не удалось прочитать данные'}</p>
                  </div>
                )}
              </div>

              {/* Bottom Sheet Tabs Bar */}
              {sheetNames.length > 0 && (
                <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 border-t border-gray-200 shrink-0 overflow-x-auto">
                  {sheetNames.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSheet(idx)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-all flex items-center gap-1.5 ${
                        activeSheetIndex === idx
                          ? 'bg-white text-emerald-700 shadow-xs border-t-2 border-emerald-600'
                          : 'text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Lightbox Modal for Full Resolution Photo View */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => setLightboxImage(null)} 
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center z-10 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Məhsul şəkli" className="max-h-[85vh] max-w-full object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseFiles;
