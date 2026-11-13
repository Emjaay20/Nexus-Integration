
'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export function FileUpload({ onFileSelect, accept = '.csv, .xlsx, .xls' }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    // Check extension
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    // Simple extension check as backup
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a CSV or Excel file.');
      return false;
    }
    
    // Check size (max 5MB for this demo)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large (max 5MB).');
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12 transition-colors duration-200 ease-in-out text-center cursor-pointer overflow-hidden",
          isDragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50",
          error ? "border-red-300 bg-red-50" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />

        <AnimatePresence mode="wait">
          {!error ? (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={clsx(
                "p-4 rounded-full transition-colors",
                isDragActive ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
              )}>
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700">
                  {isDragActive ? "Drop your file here" : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  CSV, Excel (XLSX, XLS) up to 5MB
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="error-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-2 text-red-600"
            >
               <div className="p-3 rounded-full bg-red-100 mb-2">
                 <AlertCircle className="w-6 h-6" />
               </div>
               <p className="font-medium">{error}</p>
               <button 
                 onClick={(e) => { e.stopPropagation(); setError(null); }}
                 className="text-sm underline mt-2 hover:text-red-800"
               >
                 Try again
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
