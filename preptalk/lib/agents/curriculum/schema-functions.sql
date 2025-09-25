-- Database Introspection Functions
-- These functions allow the application to query the actual database schema
-- Run these in Supabase SQL editor to enable runtime schema validation

-- Function to get table schema information
CREATE OR REPLACE FUNCTION get_table_schema(schema_name text DEFAULT 'public')
RETURNS TABLE (
    table_name text,
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        t.table_name::text,
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text
    FROM information_schema.tables t
    JOIN information_schema.columns c
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
    WHERE t.table_schema = schema_name
        AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position;
$$;

-- Function to get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(table_name text, schema_name text DEFAULT 'public')
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    ordinal_position integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        column_name::text,
        data_type::text,
        is_nullable::text,
        column_default::text,
        ordinal_position::integer
    FROM information_schema.columns
    WHERE table_schema = schema_name
        AND table_name = get_table_columns.table_name
    ORDER BY ordinal_position;
$$;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text, schema_name text DEFAULT 'public')
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = schema_name
            AND table_name = table_exists.table_name
            AND table_type = 'BASE TABLE'
    );
$$;

-- Function to get all database schema info at once
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    table_record record;
    columns_data jsonb;
BEGIN
    -- Get all tables in public schema
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
    LOOP
        -- Get columns for each table
        SELECT jsonb_object_agg(
            column_name,
            jsonb_build_object(
                'data_type', data_type,
                'is_nullable', is_nullable,
                'column_default', column_default
            )
        ) INTO columns_data
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = table_record.table_name;

        -- Add to result
        result := result || jsonb_build_object(
            table_record.table_name,
            jsonb_build_object(
                'exists', true,
                'columns', COALESCE(columns_data, '{}'::jsonb)
            )
        );
    END LOOP;

    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_schema_info() TO authenticated;

-- Optional: Grant to anon users if needed for public APIs
-- GRANT EXECUTE ON FUNCTION get_table_schema(text) TO anon;
-- GRANT EXECUTE ON FUNCTION get_table_columns(text, text) TO anon;
-- GRANT EXECUTE ON FUNCTION table_exists(text, text) TO anon;
-- GRANT EXECUTE ON FUNCTION get_schema_info() TO anon;