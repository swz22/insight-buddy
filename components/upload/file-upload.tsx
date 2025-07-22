"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, File, X, FileAudio, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateUploadedFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/utils/validation";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, accept = "audio/*,video/*", disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const validateFile = (file: File): boolean => {
    const validation = validateUploadedFile({
      type: file.type,
      size: file.size,
      name: file.name,
    });

    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return Math.round(bytes / 1024) + " KB";
    else return Math.round(bytes / 1048576) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("audio/")) return FileAudio;
    if (type.startsWith("video/")) return FileVideo;
    return File;
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={cn(
            "relative rounded-xl p-8 text-center transition-all duration-300",
            "bg-white/[0.02] backdrop-blur-sm",
            "border-2 border-dashed",
            isDragging
              ? "border-purple-400/60 bg-purple-500/10 scale-[1.02]"
              : "border-white/20 hover:border-white/30 hover:bg-white/[0.03]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />

          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300",
              "bg-gradient-to-br from-purple-500/20 to-cyan-500/20",
              isDragging && "scale-110 from-purple-500/30 to-cyan-500/30"
            )}
          >
            <Upload
              className={cn("w-8 h-8 transition-all duration-300", isDragging ? "text-purple-400" : "text-white/40")}
            />
          </div>

          <p className="text-lg mb-2 text-white/90">
            {isDragging ? "Drop your file here" : "Drag and drop your audio/video file here"}
          </p>
          <p className="text-sm text-white/40 mb-4">or</p>

          <Button
            type="button"
            variant="glass"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="hover:border-purple-400/60"
          >
            Choose File
          </Button>

          <p className="text-xs text-white/40 mt-6">
            Supported formats: MP3, WAV, M4A, MP4, WebM • Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/20 p-4 group hover:border-white/30 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = getFileIcon(selectedFile.type);
                return (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white/60" />
                  </div>
                );
              })()}
              <div>
                <p className="font-medium text-sm text-white/90">{selectedFile.name}</p>
                <p className="text-xs text-white/50">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={disabled}
              className="hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
