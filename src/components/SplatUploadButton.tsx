import React, { useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';

export interface SplatUploadButtonProps {
  /** Called after the selected file has been read into memory. */
  onSplatSelected: (fileBytes: Uint8Array, fileName: string) => void | Promise<void>;
  /** True after a custom splat has been loaded successfully this session. */
  customSplatActive: boolean;
}

const ACCEPT = '.ply,.spz,.splat,.ksplat';

const SplatUploadButton: React.FC<SplatUploadButtonProps> = ({
  onSplatSelected,
  customSplatActive,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      void (async () => {
        try {
          const buffer = await file.arrayBuffer();
          if (buffer.byteLength === 0) {
            throw new Error('Selected splat file is empty.');
          }

          const fileBytes = new Uint8Array(buffer);
          await onSplatSelected(fileBytes, file.name);
        } catch (err) {
          console.error('Failed to load splat file:', err);
          const message = err instanceof Error ? err.message : String(err);
          window.alert(`Could not load splat: ${message}`);
        }
      })();
    },
    [onSplatSelected]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-hidden="true"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={openPicker}
        className={`p-1.5 ${
          customSplatActive ? 'bg-blue-600' : 'bg-black bg-opacity-50'
        } hover:bg-opacity-70 text-white rounded transition-colors backdrop-blur-sm`}
        aria-label="Load local splat file"
        title="Load local splat (.ply, .spz, …)"
      >
        <Upload size={14} />
      </button>
    </>
  );
};

export default SplatUploadButton;
