"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { formatCnic, validateField, type FieldKind, type ValidationOptions } from "@/lib/validation";

type CommonFieldProps = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Span 2 columns on `sm` grids. */
  span2?: boolean;
  /** Additional opts beyond `required`. */
  validation?: ValidationOptions;
  autoComplete?: string;
};

type FieldProps = CommonFieldProps & {
  kind?: Exclude<FieldKind, "select" | "textarea">;
  /** For "number" / "currency". */
  min?: number;
  max?: number;
  step?: number | string;
  /** Currency code shown after the input (display only). */
  currency?: string;
  /** Optional change callback (receives processed value). */
  onChange?: (value: string) => void;
};

function classes(base: string, span2?: boolean, extra?: string): string {
  return [base, span2 ? "sm:col-span-2" : "", extra ?? ""].filter(Boolean).join(" ");
}

const INPUT_BASE =
  "mt-1 w-full rounded-xl border bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink placeholder:text-kastros-sage/70 focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30";

function inputClass(invalid: boolean): string {
  return `${INPUT_BASE} ${invalid ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-kastros-sand focus:border-kastros-brandBlue"}`;
}

export function Field({
  name,
  label,
  hint,
  defaultValue = "",
  placeholder,
  required,
  disabled,
  kind = "text",
  min,
  max,
  step,
  className,
  span2,
  validation,
  currency,
  autoComplete,
  onChange,
}: FieldProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);

  const result = useMemo(
    () => validateField(value, kind, { required, ...validation }),
    [value, kind, required, validation],
  );
  const invalid = touched && !result.ok;

  const inputType =
    kind === "number" || kind === "currency"
      ? "number"
      : kind === "tel"
        ? "tel"
        : kind === "email"
          ? "email"
          : kind === "date"
            ? "date"
            : kind === "url"
              ? "url"
              : "text";

  function handleChange(raw: string) {
    let next = raw;
    if (kind === "cnic") next = formatCnic(raw);
    setValue(next);
    onChange?.(next);
  }

  return (
    <label htmlFor={id} className={classes("text-sm block", span2, className)}>
      <span className="text-kastros-sage">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={invalid ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={inputClass(invalid)}
        />
        {currency ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-kastros-sage">
            {currency}
          </span>
        ) : null}
      </div>
      {invalid ? (
        <span id={`${id}-err`} className="mt-1 block text-xs text-red-700">
          {result.ok ? "" : result.message}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-kastros-sage">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type SelectFieldProps = CommonFieldProps & {
  options: ReadonlyArray<{ value: string; label: string } | string>;
  multiple?: boolean;
  onChange?: (value: string) => void;
};

export function SelectField({
  name,
  label,
  hint,
  defaultValue,
  required,
  disabled,
  className,
  span2,
  options,
  onChange,
}: SelectFieldProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const invalid = touched && required && !value;
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

  return (
    <label htmlFor={id} className={classes("text-sm block", span2, className)}>
      <span className="text-kastros-sage">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value); }}
        onBlur={() => setTouched(true)}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={invalid ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={inputClass(!!invalid)}
      >
        <option value="" disabled={required}>
          {required ? "Select…" : "—"}
        </option>
        {norm.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {invalid ? (
        <span id={`${id}-err`} className="mt-1 block text-xs text-red-700">
          Please choose an option.
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-kastros-sage">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type TextareaFieldProps = CommonFieldProps & {
  rows?: number;
};

export function TextareaField({
  name,
  label,
  hint,
  defaultValue = "",
  placeholder,
  required,
  disabled,
  className,
  span2,
  rows = 3,
  validation,
}: TextareaFieldProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const result = useMemo(
    () => validateField(value, "textarea", { required, ...validation }),
    [value, required, validation],
  );
  const invalid = touched && !result.ok;

  return (
    <label htmlFor={id} className={classes("text-sm block", span2, className)}>
      <span className="text-kastros-sage">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={invalid ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={inputClass(invalid)}
      />
      {invalid ? (
        <span id={`${id}-err`} className="mt-1 block text-xs text-red-700">
          {result.ok ? "" : result.message}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-kastros-sage">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function FileField({
  name,
  label,
  hint,
  accept,
  required,
  className,
  span2,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  accept?: string;
  required?: boolean;
  className?: string;
  span2?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={classes("text-sm block", span2, className)}>
      <span className="text-kastros-sage">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <input
        id={id}
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-kastros-forest"
      />
      {hint ? <span className="mt-1 block text-xs text-kastros-sage">{hint}</span> : null}
    </label>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  hint,
  className,
  span2,
  value = "1",
}: {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  hint?: ReactNode;
  className?: string;
  span2?: boolean;
  value?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={classes("inline-flex items-center gap-2 text-sm", span2, className)}>
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        value={value}
        className="rounded border-kastros-sand text-kastros-brandGreen focus:ring-kastros-brandGreen"
      />
      <span className="text-kastros-ink">{label}</span>
      {hint ? <span className="ml-2 text-xs text-kastros-sage">{hint}</span> : null}
    </label>
  );
}
