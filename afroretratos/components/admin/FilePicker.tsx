"use client";

import type { ChangeEventHandler, RefObject } from "react";

/**
 * Escolha de arquivo com rotulo proprio: o texto do <input type="file"> nativo
 * ("Choose File", "No file chosen") vem do idioma do navegador, nao do site.
 */
export function FilePicker({
  id,
  label,
  name,
  multiple = false,
  disabled = false,
  inputRef,
  onChange,
  statusText,
}: {
  id: string;
  label: string;
  name: string;
  multiple?: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: ChangeEventHandler<HTMLInputElement>;
  statusText?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label
        htmlFor={id}
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-brown-deep/40 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors hover:bg-brown-deep hover:text-beige focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine ${
          disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-brown-deep" : ""
        }`}
      >
        {label}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept="image/*"
          multiple={multiple}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />
      </label>
      {statusText ? (
        <span className="text-xs text-brown-raised">{statusText}</span>
      ) : null}
    </div>
  );
}
