import { z } from 'zod';
import { MAX_PRICE_CENTS, MIN_PRICE_CENTS, parseBrl } from '../domain/money';
import { PRICE_STATUSES, type PriceStatus } from './academy';
import { email as emailField, https as httpsUrlField, optional as optionalField, phone as phoneField } from './fields';
import { BRAZILIAN_STATES } from './profile';

// Páginas comerciais (marca, loja, serviço): separadas do perfil pessoal, como academias.
export const BUSINESS_CATEGORIES = ['brand', 'store', 'service'] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];
export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = { brand: 'Marca', store: 'Loja', service: 'Serviço' };
export const BUSINESS_CATEGORY_HELP: Record<BusinessCategory, string> = {
  brand: 'Equipamentos, roupas, suplementos ou outra marca do esporte.',
  store: 'Loja física ou on-line que vende para atletas.',
  service: 'Fisioterapia, nutrição, preparação física, fotografia, arbitragem…',
};

export const CATALOG_ITEM_KINDS = ['product', 'service'] as const;
export type CatalogItemKind = (typeof CATALOG_ITEM_KINDS)[number];
export const CATALOG_ITEM_LABELS: Record<CatalogItemKind, string> = { product: 'Produto', service: 'Serviço' };

/** Mesmos limites do banco (business_catalog_limit / business_promotions_limit). A Fase 6 liga aos planos. */
export const DEFAULT_CATALOG_LIMIT = 30;
export const DEFAULT_PROMOTIONS_LIMIT = 5;
export const DEFAULT_GALLERY_LIMIT = 12;

const name = (label: string) =>
  z.string().trim().min(2, `Informe ${label}.`).max(80, 'Máximo de 80 caracteres.');

export const newBusinessSchema = z.object({
  name: name('o nome da página'),
  category: z.enum(BUSINESS_CATEGORIES, 'Escolha o tipo da página.'),
});

export const businessSchema = z.object({
  name: name('o nome da página'),
  category: z.enum(BUSINESS_CATEGORIES, 'Escolha o tipo da página.'),
  description: optionalField(3000, 'A descrição pode ter no máximo 3000 caracteres.'),
  website: z.union([httpsUrlField, z.literal('')]).optional().transform((value) => value || null),
  instagram: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ''))
    .pipe(z.union([z.string().regex(/^[A-Za-z0-9_.]{1,30}$/, 'Instagram inválido.'), z.literal('')]))
    .optional()
    .transform((value) => value || null),
  contactEmail: emailField,
  contactPhone: phoneField,
  city: optionalField(80, 'Máximo de 80 caracteres.'),
  state: z
    .union([z.enum(BRAZILIAN_STATES, 'Estado inválido.'), z.literal('')])
    .optional()
    .transform((value) => value || null),
  martialArtIds: z.array(z.uuid()).max(12, 'Escolha até 12 modalidades.').default([]),
});

function priceFrom(status: PriceStatus | '', price: string, ctx: z.RefinementCtx) {
  if (!status) {
    ctx.addIssue({ code: 'custom', path: ['priceStatus'], message: 'Diga se tem preço, se é gratuito ou se o valor não é divulgado.' });
    return { priceStatus: 'undisclosed' as PriceStatus, priceCents: null };
  }
  if (status !== 'paid') return { priceStatus: status, priceCents: null };
  const cents = parseBrl(price);
  if (cents === null) ctx.addIssue({ code: 'custom', path: ['price'], message: 'Informe o valor. Ex.: 199,90' });
  else if (cents < MIN_PRICE_CENTS || cents > MAX_PRICE_CENTS)
    ctx.addIssue({ code: 'custom', path: ['price'], message: 'Valor deve ficar entre R$ 1,00 e R$ 100.000,00.' });
  return { priceStatus: status, priceCents: cents };
}

export const catalogItemSchema = z
  .object({
    kind: z.enum(CATALOG_ITEM_KINDS),
    name: z.string().trim().min(2, 'Informe o nome.').max(120, 'Máximo de 120 caracteres.'),
    description: optionalField(1000, 'Máximo de 1000 caracteres.'),
    priceStatus: z.union([z.enum(PRICE_STATUSES), z.literal('')]).optional().default(''),
    price: z.string().trim().max(30).optional().default(''),
    url: z.union([httpsUrlField, z.literal('')]).optional().transform((value) => value || null),
    isActive: z.boolean(),
  })
  .transform((d, ctx) => ({
    kind: d.kind,
    name: d.name,
    description: d.description,
    url: d.url,
    isActive: d.isActive,
    ...priceFrom(d.priceStatus, d.price, ctx),
  }));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

export const businessPromotionSchema = z
  .object({
    title: z.string().trim().min(2, 'Informe o título.').max(120, 'Máximo de 120 caracteres.'),
    description: optionalField(1000, 'Máximo de 1000 caracteres.'),
    couponCode: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.union([z.string().regex(/^[A-Z0-9_-]{2,40}$/, 'Use de 2 a 40 letras, números, - ou _.'), z.literal('')]))
      .optional()
      .transform((value) => value || null),
    url: z.union([httpsUrlField, z.literal('')]).optional().transform((value) => value || null),
    startsOn: isoDate,
    endsOn: z.union([isoDate, z.literal('')]).optional().transform((value) => value || null),
  })
  .refine((d) => !d.endsOn || d.endsOn >= d.startsOn, { path: ['endsOn'], message: 'O fim não pode ser antes do início.' });

export type BusinessInput = z.infer<typeof businessSchema>;
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
export type BusinessPromotionInput = z.infer<typeof businessPromotionSchema>;

/** Caminhos do bucket `covers`: '<academy|business>/<id>/<slot>-<aleatório>.(webp|jpg)'. Iguais aos checks do banco. */
export const COVER_SLOTS = ['logo', 'banner', 'gallery', 'item'] as const;
export type CoverSlot = (typeof COVER_SLOTS)[number];
export function coverPathPattern(entity: 'academy' | 'business', id: string, slot: CoverSlot): RegExp {
  return new RegExp(`^${entity}/${id}/${slot}-[a-z0-9]{6,16}\.(webp|jpg)$`);
}
