import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_COLORS = [
  { name: "Black", value: "#111111" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#9CA3AF" },
];

export default function ColorSelector({
  colors = DEFAULT_COLORS,
  onAddToCart,
  buttonLabel = "Add To Cart",
}) {
  const [selectedColor, setSelectedColor] = useState(null);
  const [showError, setShowError] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);
  const shakeTimerRef = useRef(null);

  const selectedColorMeta = useMemo(
    () => colors.find((color) => color.value === selectedColor) ?? null,
    [colors, selectedColor],
  );

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) {
        clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  const triggerButtonShake = () => {
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }

    setShakeButton(true);
    shakeTimerRef.current = window.setTimeout(() => {
      setShakeButton(false);
    }, 380);
  };

  const handleSelectColor = (colorValue) => {
    setSelectedColor(colorValue);
    if (showError) {
      setShowError(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedColorMeta) {
      setShowError(true);
      triggerButtonShake();
      return;
    }

    setShowError(false);
    onAddToCart?.(selectedColorMeta);
  };

  return (
    <div
      className={`w-full rounded-xl border-2 p-4 transition-colors sm:p-5 ${
        showError ? "border-red-500 bg-red-50/30" : "border-slate-200 bg-white"
      }`}
    >
      <p className="mb-4 text-base font-bold text-slate-900">
        Select Color <span className="text-red-500">*</span>
      </p>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
        {colors.map((color) => {
          const isSelected = selectedColor === color.value;

          return (
            <button
              key={`${color.name}-${color.value}`}
              type="button"
              onClick={() => handleSelectColor(color.value)}
              aria-label={`Select color ${color.name}`}
              aria-pressed={isSelected}
              className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg p-1 text-center transition-transform"
            >
              <span
                className={`relative h-12 w-12 rounded-lg transition-all duration-200 ease-out ${
                  isSelected
                    ? "scale-105 border-[3px] border-black shadow-sm"
                    : "border border-slate-300 group-hover:scale-[1.03] group-hover:border-slate-500 group-hover:shadow-sm"
                }`}
                style={{ backgroundColor: color.value }}
              >
                {color.value.toLowerCase() === "#ffffff" && (
                  <span className="pointer-events-none absolute inset-[3px] rounded-[5px] border border-slate-300" />
                )}

                {isSelected && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                      <path
                        d="M20 6L9 17l-5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </span>

              <span
                className={`text-xs leading-tight ${
                  isSelected ? "font-semibold text-slate-900" : "text-slate-600"
                }`}
              >
                {color.name}
              </span>
            </button>
          );
        })}
      </div>

      {showError && <p className="mt-3 text-sm font-medium text-red-600">Please choose a color</p>}

      <button
        type="button"
        onClick={handleAddToCart}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        style={shakeButton ? { animation: "color-selector-shake 0.35s ease-in-out" } : undefined}
      >
        {buttonLabel}
      </button>

      <style>{`
        @keyframes color-selector-shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
