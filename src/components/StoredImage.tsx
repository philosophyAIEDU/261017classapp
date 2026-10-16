// 저장소에 있는 사진 보여 주기 (로컬 모드의 'idb:' 주소도 실제 사진으로 바꿔 줍니다)

import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { repo } from '../repositories';

export function StoredImage({ url, alt, className = '' }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    repo
      .resolvePhotoUrl(url)
      .then((resolved) => alive && setSrc(resolved))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [url]);

  if (failed) {
    return (
      <span className={`grid place-items-center bg-primary-50 text-primary-300 ${className}`}>
        <ImageOff className="h-6 w-6" aria-label="사진을 불러오지 못했어요" />
      </span>
    );
  }
  if (!src) return <span className={`animate-pulse bg-primary-50 ${className}`} />;
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}
