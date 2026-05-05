import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../lib/firebase';
import { Upload, X, CheckCircle, File, Image as ImageIcon, Video, Loader2 } from 'lucide-react';

interface FileUploadProgress {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
}

interface MediaUploaderProps {
  onUploadComplete?: (urls: string[]) => void;
  collectionName?: string;
  folderName?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  onUploadComplete, 
  collectionName = 'media',
  folderName = 'uploads'
}) => {
  const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);
    newUploads.forEach(upload => startUpload(upload));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    }
  });

  const startUpload = async (uploadInfo: FileUploadProgress) => {
    if (!auth.currentUser) return;

    const storagePath = `${folderName}/${auth.currentUser.uid}/${Date.now()}_${uploadInfo.file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, uploadInfo.file);

    setIsUploading(true);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploads(prev => prev.map(u => 
          u.id === uploadInfo.id ? { ...u, progress } : u
        ));
      }, 
      (error) => {
        console.error("Upload failed", error);
        setUploads(prev => prev.map(u => 
          u.id === uploadInfo.id ? { ...u, status: 'error' } : u
        ));
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Save to Firestore
        await addDoc(collection(db, collectionName), {
          url: downloadURL,
          path: storagePath,
          name: uploadInfo.file.name,
          type: uploadInfo.file.type,
          userId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
        });

        setUploads(prev => prev.map(u => 
          u.id === uploadInfo.id ? { ...u, status: 'completed', url: downloadURL } : u
        ));

        // Check if all finished
        setUploads(currentUploads => {
          const completed = currentUploads.filter(u => u.status === 'completed');
          if (completed.length === currentUploads.length && currentUploads.length > 0) {
            onUploadComplete?.(completed.map(u => u.url!));
            setIsUploading(false);
          }
          return currentUploads;
        });
      }
    );
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-accent" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-pink" />;
    return <File className="w-5 h-5 text-blue" />;
  };

  return (
    <div className="w-full space-y-4">
      <div 
        {...getRootProps()} 
        className={`glass-card p-8 border-dashed border-2 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4
          ${isDragActive ? 'border-purple-accent bg-purple-accent/10' : 'border-border hover:border-purple-accent/50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-full bg-purple-accent/10 flex items-center justify-center relative">
          <Upload className={`w-8 h-8 text-purple-accent ${isDragActive ? 'animate-bounce' : ''}`} />
          {isDragActive && (
            <div className="absolute inset-0 rounded-full border-2 border-purple-accent animate-ping-slow" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Upload Images or Videos</h3>
          <p className="text-text-secondary text-sm">Drag & drop files here, or click to select</p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <div key={upload.id} className="glass-card p-4 flex items-center gap-4 animate-fade-up">
              <div className="p-2 rounded-xl bg-surface">
                {getFileIcon(upload.file.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-white truncate pr-4">
                    {upload.file.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {Math.round(upload.progress)}%
                  </span>
                </div>
                
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      upload.status === 'error' ? 'bg-red' : 
                      upload.status === 'completed' ? 'bg-green' : 'bg-purple-accent'
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {upload.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green" />
                ) : upload.status === 'error' ? (
                  <X className="w-5 h-5 text-red" />
                ) : (
                  <Loader2 className="w-5 h-5 text-purple-accent animate-spin" />
                )}
                
                <button 
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
