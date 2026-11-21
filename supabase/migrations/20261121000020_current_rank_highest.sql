-- Correção (21/11/2026): a graduação atual era a promoção com data mais recente. Quem registrava uma faixa
-- mais alta com data anterior (completando ou corrigindo o histórico) via "Graduação registrada", mas a faixa
-- atual não mudava. Decisão do usuário: a atual passa a ser a MAIOR faixa e grau registrados (faixas não
-- regridem). Desempate pela data mais recente. O histórico não muda.

create or replace function public.refresh_current_rank(p_uma uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_martial_arts u
  set current_rank_id = latest.rank_id, current_degree = coalesce(latest.degree, 0)
  from (select null::int as k) dummy
  left join lateral (
    select rp.rank_id, rp.degree
    from public.rank_promotions rp
    join public.martial_art_ranks r on r.id = rp.rank_id
    where rp.user_martial_art_id = p_uma
    order by r.ordinal desc, rp.degree desc, rp.promoted_on desc
    limit 1
  ) latest on true
  where u.id = p_uma;
$$;

-- Recalcula quem já tem graduações registradas (só muda quem tinha uma faixa maior "escondida" por data).
select public.refresh_current_rank(id) from public.user_martial_arts;
