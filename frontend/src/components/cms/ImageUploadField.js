import { useState, useRef } from 'react';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { API_URL } from '../../lib/utils';
import { toast } from 'sonner';

/**
 * ImageUploadField
 * - Drag-drop OR click-to-browse OR paste URL
 * - Calls POST /api/admin/cms/upload with the file
 * - Saves the resulting URL into the parent form
 *
 * Props:
 *   value: string (current URL)
 *   onChange: (url) => void
 *   label: string
 *   helperText?: string
 *   compact?: bool — smaller preview tile for in-list (carousel) usage
 */
export default function ImageUploadField({ value, onChange, label, helperText, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files allowed');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image too large (max 8 MB)');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`${API_URL}/admin/cms/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      onChange(data.url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const hasImage = !!value;
  const fullUrl = value && value.startsWith('/api/')
    ? `${process.env.REACT_APP_BACKEND_URL}${value}`
    : value;

  return (
    <div>
      {label && <label className="text-sm font-medium block mb-1.5">{label}</label>}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative rounded-md border-2 border-dashed transition ${
          dragOver ? 'border-primary bg-primary/5' : 'border-input'
        } ${compact ? 'p-3' : 'p-6'} text-center cursor-pointer hover:bg-muted/30`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : hasImage ? (
          <div className="flex items-center gap-3 text-left">
            <img
              src={fullUrl}
              alt="preview"
              className={compact ? 'h-12 w-12 object-cover rounded' : 'h-20 w-20 object-cover rounded'}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Click to replace or drop a new file</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              type="button"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-sm font-medium">Drop image or click to upload</span>
            <span className="text-[10px]">PNG, JPG, WebP up to 8 MB</span>
          </div>
        )}
      </div>
      {helperText && <p className="text-[10px] text-muted-foreground mt-1">{helperText}</p>}
      <div className="mt-2">
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs"
        />
      </div>
    </div>
  );
}
