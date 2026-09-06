-- VERIFY , all three must report indisvalid = true.
-- A CONCURRENTLY build that fails leaves an INVALID index behind: it still
-- occupies disk, is never used by the planner, and reports no error anywhere.
-- Drop and rebuild any row that comes back false.
select c.relname                                as index_name,
       i.indisvalid,
       i.indisready,
       pg_size_pretty(pg_relation_size(c.oid))  as size
from   pg_index i
join   pg_class c on c.oid = i.indexrelid
where  c.relname in ('idx_mv_pname_trgm','idx_mv_tname_trgm','idx_mv_pnameraw_trgm')
order  by c.relname;
