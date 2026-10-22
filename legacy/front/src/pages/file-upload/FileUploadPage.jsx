import React, { useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import Card from '../../components/ui/Card';

const FileUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const fileList = newFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'pending', // pending, uploading, success, error
      progress: 0,
    }));

    setFiles(prev => [...prev, ...fileList]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadFiles = async () => {
    for (const fileItem of files) {
      if (fileItem.status === 'success') continue;

      // 업로드 시작
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // 시뮬레이션: 실제로는 API 호출
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, progress: i } : f
        ));
      }

      // 업로드 완료
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
      ));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return '업로드 중...';
      case 'success':
        return '완료';
      case 'error':
        return '실패';
      default:
        return '대기 중';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">파일 업로드</h1>
        <p className="text-gray-600">파일을 업로드하고 관리하세요</p>
      </div>

      <Card>
        <Card.Content>
          {/* 드래그 앤 드롭 영역 */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-indigo-600 hover:text-indigo-500 font-medium"
              >
                파일을 선택하거나
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <span className="text-gray-600"> 여기에 드래그하세요</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG 등 (최대 50MB)
            </p>
          </div>

          {/* 파일 목록 */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  업로드할 파일 ({files.length})
                </h3>
                <button
                  onClick={uploadFiles}
                  disabled={files.every(f => f.status === 'success')}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  모두 업로드
                </button>
              </div>

              <div className="space-y-2">
                {files.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <File className="h-8 w-8 text-gray-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileItem.name}
                        </p>
                        <span className={`text-xs font-medium ml-2 ${getStatusColor(fileItem.status)}`}>
                          {getStatusText(fileItem.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{fileItem.size}</p>

                      {/* 진행률 바 */}
                      {fileItem.status === 'uploading' && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${fileItem.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 상태 아이콘 */}
                    <div className="flex-shrink-0">
                      {fileItem.status === 'success' ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <button
                          onClick={() => removeFile(fileItem.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          disabled={fileItem.status === 'uploading'}
                        >
                          <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default FileUploadPage;
