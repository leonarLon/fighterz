"use client";

import { useActionState } from "react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_HELP, BUSINESS_CATEGORY_LABELS } from "@figtherz/core";
import { createBusiness } from "@/app/actions/businesses";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

export function NewBusinessForm() {
  const [state, action, pending] = useActionState(createBusiness, idleState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField id="name" label="Nome da página" required maxLength={80} defaultValue={state.values?.name} errors={e.name} />
      <fieldset aria-describedby={e.category ? "category-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold">Tipo</legend>
        <div className="space-y-2">
          {BUSINESS_CATEGORIES.map((c) => (
            <label key={c} className="flex items-start gap-3 rounded-md border border-border p-3">
              <input
                type="radio"
                name="category"
                value={c}
                defaultChecked={state.values?.category === c}
                className="mt-0.5 size-5 shrink-0 accent-(--primary)"
              />
              <span>
                <span className="block font-semibold">{BUSINESS_CATEGORY_LABELS[c]}</span>
                <span className="block text-[13px] text-muted">{BUSINESS_CATEGORY_HELP[c]}</span>
              </span>
            </label>
          ))}
        </div>
        {e.category && (
          <p id="category-error" className="mt-1.5 text-[13px] font-medium text-danger">
            {e.category[0]}
          </p>
        )}
      </fieldset>
      <Button type="submit" loading={pending}>
        Criar página
      </Button>
    </form>
  );
}
