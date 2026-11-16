import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] select-none transition-[opacity,transform,background-color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_5px_14px_color-mix(in_srgb,var(--primary)_18%,transparent)] hover:brightness-[1.04]",
        secondary: "bg-card text-foreground border border-border shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_4%,transparent)] hover:bg-muted/70",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        outline: "border border-border bg-card/70 text-foreground hover:bg-muted",
        danger: "bg-danger text-white",
        subtle: "bg-muted text-foreground",
      },
      size: {
        default: "h-11 min-h-11 px-4 text-sm rounded-[var(--radius-md)]",
        sm: "h-9 min-h-9 px-3 text-sm rounded-[var(--radius-sm)]",
        lg: "h-12 min-h-12 px-5 text-base rounded-[var(--radius-lg)]",
        icon: "size-11 min-h-11 rounded-[var(--radius-md)]",
        pill: "h-11 min-h-11 px-5 text-sm rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-foreground placeholder:text-subtle outline-none transition-[box-shadow,border-color] duration-[var(--motion-quick)] focus:border-primary/45 focus:ring-4 focus:ring-ring/10",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-subtle outline-none focus:border-primary/45 focus:ring-4 focus:ring-ring/10",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary/45 focus:ring-4 focus:ring-ring/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-muted-foreground", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-xl)] border border-border/80 bg-card p-5 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent)]", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    good: "bg-success/12 text-success",
    warn: "bg-warning/12 text-warning",
    bad: "bg-danger/12 text-danger",
    brand: "bg-primary/12 text-primary",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em]", tones[tone], className)}
      {...props}
    />
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-md)] bg-muted", className)} />;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-11 min-h-7 rounded-full transition-colors duration-[var(--motion-quick)]",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-card shadow-sm transition-transform duration-[var(--motion-quick)] ease-[var(--ease-out)]",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex rounded-[var(--radius-lg)] bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 min-h-9 flex-1 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-[var(--motion-quick)]",
            value === o.id ? "bg-card text-foreground" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-card/80 px-5 py-9 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_3%,transparent)]">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "mt-2 truncate font-sans text-[1.65rem] font-semibold leading-tight tracking-[-0.045em] tabular",
          tone === "good" && "text-success",
          tone === "bad" && "text-danger",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
