"use client"

import { useState, useRef } from "react"
import imageCompression from "browser-image-compression"
import { Camera, ImagePlus, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  /** Unique field id for naming the storage file */
  fieldId: string
  /** Called with the local URL path after successful upload */
  onUploaded: (path: string) => void
  /** Called when image is removed */
  onRemoved?: () => void
  /** Current value (URL path) */
  value?: string | null
  /** Whether the field is disabled */
  disabled?: boolean
}

type UploadState = "idle" | "compressing" | "uploading" | "success" | "error"

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
}

export function ImageUpload({ fieldId, onUploaded, onRemoved, value, disabled }: ImageUploadProps) {
  const [state, setState] = useState<UploadState>(value ? "success" : "idle")
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    const originalSize = (file.size / 1024 / 1024).toFixed(1)

    try {
      // Step 1: Compress
      setState("compressing")
      setProgress(20)

      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
      const compressedSize = (compressed.size / 1024 / 1024).toFixed(1)
      console.log(`[ImageUpload] Sıkıştırma: ${originalSize}MB → ${compressedSize}MB`)

      // Generate local preview
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(compressed)

      // Step 2: Upload to local server
      setState("uploading")
      setProgress(50)

      const formData = new FormData()
      formData.append('file', compressed, `${fieldId}_${Date.now()}.jpg`)
      formData.append('folder', 'incidents')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const result = await res.json()

      if (result.error) throw new Error(result.error)

      setProgress(100)
      setState("success")
      onUploaded(result.url)
    } catch (err: any) {
      console.error("[ImageUpload] Hata:", err)
      setState("error")
      setError(err?.message || "Fotoğraf yüklenemedi.")
      setPreview(null)
    }

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleRemove = () => {
    setPreview(null)
    setState("idle")
    setProgress(0)
    setError("")
    onRemoved?.()
  }

  const isProcessing = state === "compressing" || state === "uploading"

  return (
    <div className="space-y-2">
      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Preview or Upload Trigger */}
      {(preview || value) && state !== "idle" ? (
        <div className="relative group">
          <img
            src={preview || value || ""}
            alt="Yüklenen fotoğraf"
            className="w-full max-h-56 object-cover rounded-xl border-2 border-border"
          />
          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-white text-sm font-medium">
                {state === "compressing" ? "Sıkıştırılıyor..." : "Yükleniyor..."}
              </p>
              <div className="w-2/3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {/* Success overlay */}
          {state === "success" && (
            <div className="absolute top-2 right-2 flex gap-2">
              <div className="bg-success text-white p-1.5 rounded-full shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-danger text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={cn(
            "w-full min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]",
            state === "error"
              ? "border-danger/50 bg-danger/5 text-danger"
              : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6" />
            <ImagePlus className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium">Fotoğraf Çek veya Galeriden Seç</span>
          <span className="text-xs opacity-60">Maks 2MB · JPEG, PNG, WebP</span>
        </button>
      )}

      {/* Error message */}
      {state === "error" && error && (
        <div className="flex items-center gap-2 text-danger text-sm p-2 bg-danger/5 rounded-lg">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => { setState("idle"); setError("") }}
            className="ml-auto text-xs underline"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  )
}
