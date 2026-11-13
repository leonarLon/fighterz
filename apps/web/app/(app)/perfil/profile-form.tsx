"use client";

import { useActionState } from "react";
import { BRAZILIAN_STATES } from "@figtherz/core";
import { updateProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { idleState } from "@/lib/form-state";

type ProfileValues = {
  username: string;
  displayName: string;
  bio: string;
  city: string;
  state: string;
  isPrivate: boolean;
};

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const [state, action, pending] = useActionState(updateProfile, idleState);
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  // `key` remonta os campos com os valores devolvidos pela action (o React limpa o form após o envio).
  const formKey = v ? JSON.stringify(v) : "initial";

  return (
    <form key={formKey} action={action} className="space-y-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <InputField
        id="displayName"
        label="Nome"
        required
        maxLength={60}
        defaultValue={v?.displayName ?? profile.displayName}
        errors={errors.displayName}
      />
      <InputField
        id="username"
        label="Nome de usuário"
        required
        autoCapitalize="none"
        maxLength={30}
        help="Letras minúsculas, números, ponto ou sublinhado."
        defaultValue={v?.username ?? profile.username}
        errors={errors.username}
      />
      <TextareaField
        id="bio"
        label="Bio"
        maxLength={500}
        rows={4}
        help="Até 500 caracteres. Conte sua história no tatame."
        defaultValue={v?.bio ?? profile.bio}
        errors={errors.bio}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <InputField id="city" label="Cidade" maxLength={80} defaultValue={v?.city ?? profile.city} errors={errors.city} />
        <SelectField id="state" label="Estado" defaultValue={v?.state ?? profile.state} errors={errors.state}>
          <option value="">—</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </SelectField>
      </div>
      <label className="flex items-start gap-3 rounded-md border border-border p-3">
        <input
          type="checkbox"
          name="isPrivate"
          defaultChecked={v ? v.isPrivate === "on" : profile.isPrivate}
          className="mt-0.5 size-5 shrink-0 accent-(--primary)"
        />
        <span>
          <span className="block font-semibold">Perfil privado</span>
          <span className="block text-[13px] text-muted">
            Só seguidores aprovados por você verão suas publicações.
          </span>
        </span>
      </label>
      <Button type="submit" loading={pending}>
        Salvar perfil
      </Button>
    </form>
  );
}
