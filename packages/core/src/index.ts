// Regras de domínio e schemas compartilhados entre web e o futuro app mobile.
// Este pacote não pode depender de React, Next.js ou APIs de navegador.
export * from './domain/age';
export * from './domain/password';
export * from './domain/theme';
export * from './schemas/auth';
export * from './schemas/profile';
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './db/types';
