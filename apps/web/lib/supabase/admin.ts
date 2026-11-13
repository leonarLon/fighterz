import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente com a chave secreta (ignora RLS). Só no servidor e só para o que a API do Storage exige
 * (apagar arquivos da fila de limpeza). Nunca usar para ler ou gravar dados de usuários.
 * Retorna null quando SUPABASE_SECRET_KEY não está configurada.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
