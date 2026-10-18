// 사진 올리기: 고른 사진을 자동으로 작게 줄인 뒤(압축) 미리 보여 줍니다.

import imageCompression from 'browser-image-compression';
import { Camera, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { appConfig } from '../config/appConfig';
import { StoredImage } from './StoredImage';

export interface PhotoItem {
  /** 이미 저장된 사진 주소 */
  url?: string;
  /** 새로 고른(압축된) 사진 */
  file?: Blob;
}

interface PhotoUploaderProps {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
  max?: number;
}

function Preview({ file }: { file: Blob }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} alt="고른 사진 미리보기" className="h-full w-full object-cover" /> : null;
}

export function PhotoUploader({ items, onChange, max = appConfig.routines.maxPhotos }: PhotoUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const files = [...list].slice(0, max - items.length);
    if (files.some((f) => !f.type.startsWith('image/'))) {
      setError('사진 파일만 올릴 수 있어요.');
      return;
    }
    setBusy(true);
    try {
      const compressed = await Promise.all(
        files.map((f) => imageCompression(f, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false })),
      );
      onChange([...items, ...compressed.map((file) => ({ file }))]);
    } catch {
      setError('사진을 줄이는 중 문제가 생겼어요. 다른 사진으로 해 볼까요?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-primary-100">
            {item.file ? <Preview file={item.file} /> : item.url && <StoredImage url={item.url} alt={`인증 사진 ${i + 1}`} className="h-full w-full" />}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-primary-950/80 text-white"
              aria-label={`사진 ${i + 1} 빼기`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary-200 text-[14px] font-semibold text-primary-700 hover:border-primary-400">
            <Camera className="h-6 w-6" aria-hidden />
            {busy ? '줄이는 중…' : `사진 (${items.length}/${max})`}
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
      {error && <p className="mt-2 font-semibold text-danger">{error}</p>}
    </div>
  );
}
