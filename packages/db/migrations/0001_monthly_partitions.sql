-- Monthly range partitions for high-volume tables (audit_log, domain_events, stock_ledger,
-- vitals, invoices). Creates the partition for p_from's month and the p_months_ahead months
-- after it, skipping any that exist (idempotent). Returns how many it created.
--
-- SECURITY DEFINER so the scheduled job can run as hims_app (which cannot CREATE TABLE) instead
-- of holding owner credentials. It only accepts tables range-partitioned on one timestamptz/date
-- column and builds every identifier with format(%I), so it cannot be steered into other DDL.
-- Bounds are UTC month starts (AGENTS.md: time is timestamptz UTC).
--
-- Each new partition gets RLS enabled + forced with no policy: through the parent, the parent's
-- tenant policy applies; queried directly by name, a partition returns nothing.
CREATE OR REPLACE FUNCTION app_ensure_monthly_partitions(
  p_parent regclass,
  p_months_ahead integer DEFAULT 3,
  p_from date DEFAULT current_date
) RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
  SET "TimeZone" = 'UTC'
AS $$
DECLARE
  v_strategy "char";
  v_key_count smallint;
  v_key_type regtype;
  v_schema name;
  v_table name;
  v_month date;
  v_name text;
  v_created integer := 0;
BEGIN
  IF p_months_ahead IS NULL OR p_months_ahead < 0 OR p_months_ahead > 24 THEN
    RAISE EXCEPTION 'p_months_ahead must be between 0 and 24, got %', p_months_ahead;
  END IF;

  SELECT pt.partstrat, pt.partnatts, a.atttypid::regtype
    INTO v_strategy, v_key_count, v_key_type
    FROM pg_partitioned_table pt
    LEFT JOIN pg_attribute a ON a.attrelid = pt.partrelid AND a.attnum = pt.partattrs[0]
   WHERE pt.partrelid = p_parent;

  IF NOT FOUND OR v_strategy <> 'r' OR v_key_count <> 1
     OR v_key_type NOT IN ('timestamp with time zone'::regtype, 'date'::regtype) THEN
    RAISE EXCEPTION '% is not range-partitioned on a single timestamptz/date column', p_parent
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT n.nspname, c.relname INTO v_schema, v_table
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.oid = p_parent;

  FOR i IN 0..p_months_ahead LOOP
    v_month := (date_trunc('month', p_from) + make_interval(months => i))::date;
    v_name := format('%s_p%s', v_table, to_char(v_month, 'YYYYMM'));
    CONTINUE WHEN to_regclass(format('%I.%I', v_schema, v_name)) IS NOT NULL;

    BEGIN
      EXECUTE format(
        'CREATE TABLE %I.%I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
        v_schema, v_name, p_parent, v_month, (v_month + interval '1 month')::date
      );
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      CONTINUE; -- a concurrent run created it first
    END;
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_schema, v_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', v_schema, v_name);
    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_ensure_monthly_partitions(regclass, integer, date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_ensure_monthly_partitions(regclass, integer, date) TO hims_app;
