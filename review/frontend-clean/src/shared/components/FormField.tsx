import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { id, label, error, hint, className, ...inputProps },
  ref,
) {
  const describedBy = [hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {inputProps.required && (
          <span aria-hidden="true" className="required-mark">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        {...inputProps}
        id={id}
        ref={ref}
        className={['input', className].filter(Boolean).join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
      />
      {hint && (
        <div className="field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      )}
      {error && (
        <div className="field-error" id={`${id}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
});
