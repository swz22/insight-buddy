export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url: string;
  path: string;
  fileName: string;
  originalName: string;
}

export function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    // Progress tracking
    xhr.upload.addEventListener("progress", (event) => {
      console.log("Progress event:", event.loaded, event.total, event.lengthComputable);
      if (event.lengthComputable && onProgress) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        console.log("Upload progress:", percentage + "%");
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        });
      }
    });

    // Success handler
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || "Upload failed"));
          }
        } catch (error) {
          reject(new Error("Invalid server response"));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Error handlers
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
      });
    }

    // Send request
    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}
