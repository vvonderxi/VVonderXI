-- STEP 4 , GRANT BEFORE THE SWAP. This is the whole point of the swap approach.
-- A denied SELECT under RLS returns EMPTY WITH NO ERROR, so a missing grant renders as an
-- empty site rather than a fault. Granting here keeps that failure mode off production
-- entirely: if the grant is wrong, it is wrong on an object nobody is reading yet.
-- ALTER DEFAULT PRIVILEGES in public should already cover this, but it is not relied on.
GRANT SELECT ON public.player_card_mv_new TO anon, authenticated, service_role;
