import { useEffect, useState } from "react";
import QRCode, { type QRCodeToDataURLOptions } from "qrcode";

const DEFAULT_OPTIONS: QRCodeToDataURLOptions = {
  errorCorrectionLevel: "H",
  margin: 1,
  width: 180,
  color: {
    dark: "#4c1d95",
    light: "#ffffff",
  },
};

export const useQrDataUrl = (
  value: string | null,
  options?: QRCodeToDataURLOptions
) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const generate = async () => {
      if (!value) {
        setDataUrl(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const url = await QRCode.toDataURL(value, {
          ...DEFAULT_OPTIONS,
          ...(options || {}),
        });
        if (active) {
          setDataUrl(url);
        }
      } catch (err) {
        if (active) {
          setError(err as Error);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    generate();

    return () => {
      active = false;
    };
  }, [value, JSON.stringify(options || {})]);

  return { dataUrl, isLoading, error };
};
