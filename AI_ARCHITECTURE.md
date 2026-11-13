# Arquitetura de IA

> **Removida do escopo** por decisão do responsável pelo produto em 13/11/2026.

O Figtherz **não terá** funcionalidades de inteligência artificial: nada de assistente de descoberta, RAG, busca semântica nem ferramentas de IA para professores.

## Consequências no projeto
- Sem Ollama, modelos de linguagem ou embeddings no ambiente.
- Sem extensão `pgvector` e sem as tabelas `ai_documents`/`ai_embeddings`.
- Sem o consentimento `ai_opt_in` em `user_settings`.
- A antiga Fase 7 saiu do roadmap.
- A descoberta de academias e aulas usa **busca e filtros tradicionais**: modalidade, nível, dia, período, aula experimental, cidade, bairro e distância (PostGIS). Isso resolve o caso "sou iniciante, quero Muay Thai à noite perto de mim" com filtros.

## Se a decisão for revista no futuro
O desenho anterior (IA local via Ollama, que só consulta dados reais do banco) está no histórico do git deste arquivo. Reintroduzir exige nova aprovação e nova checagem em `COST_ZERO_POLICY.md`.
