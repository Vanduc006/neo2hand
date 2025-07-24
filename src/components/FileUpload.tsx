import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, X, Image, Video, File } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  disabled?: boolean
  onClear?: () => void // Add callback to clear files
}

export interface UploadedFile {
  url: string
  name: string
  type: string
  size: number
}

export interface FileUploadRef {
  clearFiles: () => void
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ 
  onFilesSelected, 
  maxFiles = 5, 
  maxFileSize = 10,
  disabled = false,
  onClear
}, ref) => {
  const [uploading, setUploading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear files when parent requests it
  useEffect(() => {
    if (onClear) {
      const clearFiles = () => setAttachedFiles([])
      // This will be called from parent component
      return clearFiles
    }
  }, [onClear])

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `chat-files/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      return {
        url: data.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      return null
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Check file count
    if (fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Check file sizes
    const oversizedFiles = fileArray.filter(file => file.size > maxFileSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      alert(`Files over ${maxFileSize}MB: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    // Auto-upload files immediately when selected
    setUploading(true)
    const uploadedFiles: UploadedFile[] = []

    for (const file of fileArray) {
      const uploaded = await uploadFile(file)
      if (uploaded) {
        uploadedFiles.push(uploaded)
      }
    }

    if (uploadedFiles.length > 0) {
      setAttachedFiles(uploadedFiles)
      onFilesSelected(uploadedFiles)
    }
    
    setUploading(false)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index)
    setAttachedFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  // Expose clear function to parent
  useImperativeHandle(ref, () => ({
    clearFiles: () => setAttachedFiles([])
  }), [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="p-2"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* {selectedFiles.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? 'Uploading...' : `Send ${selectedFiles.length} file(s)`}
          </Button>
        )} */}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachedFiles.length > 0 && (
        <div className="space-y-1">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
              <div className="flex items-center gap-2">
                {getFileIcon(file.type)}
                <span className="truncate max-w-32">{file.name}</span>
                <span className="text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="p-1 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

FileUpload.displayName = "FileUpload"

export default FileUpload
