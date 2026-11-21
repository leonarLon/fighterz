import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "./cn";

const control =
  "block w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-muted/80 transition-colors disabled:opacity-60 aria-invalid:border-danger";

type FieldShellProps = {
  id: string;
  label: string;
  help?: ReactNode;
  errors?: string[];
  children: ReactNode;
};

/** Rótulo + ajuda + erro com ícone e texto (nunca só cor). */
export function FieldShell({ id, label, help, errors, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {help && !errors?.length && (
        <p id={`${id}-help`} className="text-[13px] text-muted">
          {help}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[13px] font-medium text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{errors[0]}</span>
        </p>
      ) : null}
    </div>
  );
}

function a11y(id: string, help?: ReactNode, errors?: string[]) {
  const invalid = Boolean(errors?.length);
  return {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${id}-error` : help ? `${id}-help` : undefined,
  };
}

type Common = { id: string; label: string; help?: ReactNode; errors?: string[] };

export function InputField({ id, label, help, errors, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} help={help} errors={errors}>
      <input id={id} name={id} {...a11y(id, help, errors)} className={cn(control, className)} {...props} />
    </FieldShell>
  );
}

export function TextareaField({
  id,
  label,
  help,
  errors,
  className,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} help={help} errors={errors}>
      <textarea id={id} name={id} {...a11y(id, help, errors)} className={cn(control, "min-h-24", className)} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  help,
  errors,
  className,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  // O React reinicia o <form> depois de cada action e o select volta à opção marcada na montagem
  // (defaultValue não é reaplicado). Recriar o select quando o valor padrão muda mantém a escolha
  // devolvida pela action após um erro de validação.
  const resetKey = props.defaultValue !== undefined ? String(props.defaultValue) : undefined;
  return (
    <FieldShell id={id} label={label} help={help} errors={errors}>
      <select key={resetKey} id={id} name={id} {...a11y(id, help, errors)} className={cn(control, className)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
