-- Hardens app_ensure_monthly_partitions (SECURITY DEFINER, callable by hims_app).
-- Review finding: the partition-key type check failed open for expression keys
-- (partattrs[0] = 0 -> key type NULL -> "NULL NOT IN (...)" is NULL -> no RAISE), and the function
-- accepted caller-controlled temporary tables with public in its search_path. Now:
--   * the function and every object are owned by the non-superuser hims_owner (01-roles.sql);
--   * the key must be exactly one plain timestamptz/date column (NULL-safe checks);
--   * the parent must be a permanent table in an allowlisted schema (public), owned by the
--     function owner, and short enough for the _pYYYYMM suffix;
--   * search_path is pg_catalog then pg_temp; everything is schema-qualified.
CREATE OR REPLACE FUNCTION public.app_ensure_monthly_partitions(
  p_parent regclass,
  p_months_ahead integer DEFAULT 3,
  p_from date DEFAULT current_date
) RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
  SET "TimeZone" = 'UTC'
AS $$
DECLARE
  v_strategy "char";
  v_key_count smallint;
  v_key_attnum smallint;
  v_key_type regtype;
  v_schema name;
  v_table name;
  v_persistence "char";
  v_owner oid;
  v_month date;
  v_name text;
  v_created integer := 0;
BEGIN
  IF p_months_ahead IS NULL OR p_months_ahead < 0 OR p_months_ahead > 24 THEN
    RAISE EXCEPTION 'p_months_ahead must be between 0 and 24, got %', p_months_ahead
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT n.nspname, c.relname, c.relpersistence, c.relowner
    INTO v_schema, v_table, v_persistence, v_owner
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE c.oid = p_parent;

  IF NOT FOUND
     OR v_persistence IS DISTINCT FROM 'p'
     OR v_schema IS DISTINCT FROM 'public'
     OR v_owner IS DISTINCT FROM (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = current_user)
     OR pg_catalog.length(v_table) > 55 THEN
    RAISE EXCEPTION '% is not an allowed partitioned table', p_parent
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT pt.partstrat, pt.partnatts, pt.partattrs[0]
    INTO v_strategy, v_key_count, v_key_attnum
    FROM pg_catalog.pg_partitioned_table pt
   WHERE pt.partrelid = p_parent;

  IF FOUND AND v_key_attnum IS DISTINCT FROM 0 THEN
    SELECT a.atttypid::regtype INTO v_key_type
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = p_parent AND a.attnum = v_key_attnum AND NOT a.attisdropped;
  END IF;

  IF v_strategy IS DISTINCT FROM 'r'
     OR v_key_count IS DISTINCT FROM 1
     OR v_key_attnum IS NULL OR v_key_attnum = 0
     OR v_key_type IS NULL
     OR v_key_type NOT IN ('pg_catalog.timestamptz'::regtype, 'pg_catalog.date'::regtype) THEN
    RAISE EXCEPTION '% is not range-partitioned on a single timestamptz/date column', p_parent
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  FOR i IN 0..p_months_ahead LOOP
    v_month := (pg_catalog.date_trunc('month', p_from) + pg_catalog.make_interval(months => i))::date;
    v_name := pg_catalog.format('%s_p%s', v_table, pg_catalog.to_char(v_month, 'YYYYMM'));
    CONTINUE WHEN pg_catalog.to_regclass(pg_catalog.format('%I.%I', v_schema, v_name)) IS NOT NULL;

    BEGIN
      EXECUTE pg_catalog.format(
        'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
        v_schema, v_name, v_schema, v_table, v_month, (v_month + interval '1 month')::date
      );
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      CONTINUE; -- a concurrent run created it first
    END;
    EXECUTE pg_catalog.format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_schema, v_name);
    EXECUTE pg_catalog.format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', v_schema, v_name);
    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.app_ensure_monthly_partitions(regclass, integer, date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.app_ensure_monthly_partitions(regclass, integer, date) TO hims_app;
