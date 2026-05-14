"use client";

import { useEffect, useState } from "react";

type DollarExchangeInputProps = {
  defaultValue: number;
  storageKey: string;
};

export function DollarExchangeInput({
  defaultValue,
  storageKey,
}: DollarExchangeInputProps) {
  const [value, setValue] = useState(defaultValue.toFixed(2));

  useEffect(() => {
    const savedValue = window.localStorage.getItem(storageKey);

    if (savedValue) {
      setValue(savedValue);
    }
  }, [storageKey]);

  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-slate-200"
        htmlFor="dollarExchangeRate"
      >
        Dólar do dia
      </label>
      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
        id="dollarExchangeRate"
        min="0"
        name="dollarExchangeRate"
        onChange={(event) => {
          setValue(event.target.value);
          window.localStorage.setItem(storageKey, event.target.value);
        }}
        step="0.01"
        type="number"
        value={value}
      />
      <p className="mt-2 text-xs text-slate-500">
        Salvo neste navegador para este projeto/período. Clique em Aplicar
        filtros para recalcular.
      </p>
    </div>
  );
}
