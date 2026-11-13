import { CircleAlert } from "lucide-react";

/** Grupo de checkboxes de modalidades (name="martialArtIds"). */
export function MartialArtCheckboxes({
  arts,
  selected = [],
  errors,
  legend = "Modalidades",
}: {
  arts: { id: string; name: string }[];
  selected?: string[];
  errors?: string[];
  legend?: string;
}) {
  return (
    <fieldset aria-describedby={errors?.length ? "martialArtIds-error" : undefined}>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {arts.map((art) => (
          <label key={art.id} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input type="checkbox" name="martialArtIds" value={art.id} defaultChecked={selected.includes(art.id)} className="size-4 accent-(--primary)" />
            {art.name}
          </label>
        ))}
      </div>
      {errors?.length ? (
        <p id="martialArtIds-error" className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
