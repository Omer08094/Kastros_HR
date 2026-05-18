/**
 * Shared validation utilities for the HR forms.
 *
 * Keep these stateless / pure so they can be used both for live (per-keystroke)
 * client-side feedback and for final submit-time checks.
 */

export type FieldKind =
  | "text"
  | "email"
  | "tel"
  | "cnic"
  | "date"
  | "number"
  | "currency"
  | "url"
  | "select"
  | "textarea";

export type ValidationOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Custom message returned in addition to / instead of the default. */
  message?: string;
  /** Custom regex applied for text/textarea fields after the kind-specific check. */
  pattern?: RegExp;
  /** Message to use when the custom pattern fails. */
  patternMessage?: string;
};

/** Result of validating a single field value. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
/** ISO date YYYY-MM-DD (HTML date input format). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Pakistan CNIC formatted as 12345-1234567-1 (with hyphens). 13-digit unformatted is also accepted. */
const CNIC_FORMATTED_RE = /^\d{5}-\d{7}-\d$/;
const CNIC_DIGITS_RE = /^\d{13}$/;
/** Internationally formatted phone: starts with optional +, up to 18 digits with separators. */
const PHONE_RE = /^\+?[\d\s\-().]{7,22}$/;

export function validateField(value: string, kind: FieldKind, opts: ValidationOptions = {}): ValidationResult {
  const v = (value ?? "").toString();
  const trimmed = v.trim();

  if (opts.required && !trimmed) {
    return { ok: false, message: opts.message ?? "This field is required." };
  }
  if (!trimmed) return { ok: true };

  if (opts.minLength != null && trimmed.length < opts.minLength) {
    return { ok: false, message: `Must be at least ${opts.minLength} characters.` };
  }
  if (opts.maxLength != null && trimmed.length > opts.maxLength) {
    return { ok: false, message: `Must be at most ${opts.maxLength} characters.` };
  }

  switch (kind) {
    case "email":
      if (!EMAIL_RE.test(trimmed)) {
        return { ok: false, message: opts.message ?? "Please enter a valid email address (name@example.com)." };
      }
      break;
    case "tel":
      if (!PHONE_RE.test(trimmed)) {
        return {
          ok: false,
          message: opts.message ?? "Please enter a valid phone number (digits, spaces, +, - or parentheses).",
        };
      }
      break;
    case "cnic":
      if (!(CNIC_FORMATTED_RE.test(trimmed) || CNIC_DIGITS_RE.test(trimmed))) {
        return {
          ok: false,
          message: opts.message ?? "CNIC must be 13 digits, e.g. 12345-1234567-1.",
        };
      }
      break;
    case "date":
      if (!ISO_DATE_RE.test(trimmed)) {
        return { ok: false, message: opts.message ?? "Pick a valid date." };
      }
      if (Number.isNaN(new Date(`${trimmed}T12:00:00Z`).getTime())) {
        return { ok: false, message: opts.message ?? "That date is invalid." };
      }
      break;
    case "number":
    case "currency": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        return { ok: false, message: opts.message ?? "Enter a valid number." };
      }
      if (opts.min != null && n < opts.min) {
        return { ok: false, message: opts.message ?? `Must be ≥ ${opts.min}.` };
      }
      if (opts.max != null && n > opts.max) {
        return { ok: false, message: opts.message ?? `Must be ≤ ${opts.max}.` };
      }
      break;
    }
    case "url":
      if (!URL_RE.test(trimmed)) {
        return { ok: false, message: opts.message ?? "Enter a valid URL beginning with http:// or https://." };
      }
      break;
    default:
      break;
  }

  if (opts.pattern && !opts.pattern.test(trimmed)) {
    return { ok: false, message: opts.patternMessage ?? opts.message ?? "Invalid value." };
  }

  return { ok: true };
}

/** Normalize a CNIC value to the canonical 12345-1234567-1 representation. */
export function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Convenience: validate a Map<string, string> with a schema description. */
export function validateAll(
  values: Record<string, string>,
  schema: Record<string, { kind: FieldKind; opts?: ValidationOptions; label?: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(schema)) {
    const def = schema[key];
    if (!def) continue;
    const r = validateField(values[key] ?? "", def.kind, def.opts);
    if (!r.ok) {
      errors[key] = def.label ? `${def.label}: ${r.message}` : r.message;
    }
  }
  return errors;
}
