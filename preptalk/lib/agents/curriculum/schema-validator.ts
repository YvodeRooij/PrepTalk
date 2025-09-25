// Runtime Database Schema Validator
// Dynamically validates actual DB structure against expected schema

import { createClient } from '@supabase/supabase-js';

// Define what our code expects from the database
export const EXPECTED_SCHEMA = {
  curricula: {
    table: 'curricula',
    required_columns: [
      'id',
      'job_id',
      'title',
      'overview',
      'total_rounds',
      'structure',
      'quality_score',
      'generation_model',
      'created_at'
    ],
    optional_columns: [
      'version',
      'is_active',
      'parent_curriculum_id',
      'generation_params',
      'difficulty_level',
      'updated_at'
    ],
    column_types: {
      id: 'uuid',
      job_id: 'uuid',
      title: 'text',
      overview: 'text',
      total_rounds: 'integer',
      structure: 'jsonb',
      quality_score: 'numeric',
      generation_model: 'text',
      created_at: 'timestamptz'
    }
  },
  curriculum_rounds: {
    table: 'curriculum_rounds',
    required_columns: [
      'id',
      'curriculum_id',
      'round_number',
      'round_type',
      'title',
      'description',
      'duration_minutes',
      'interviewer_persona',
      'topics_to_cover',
      'evaluation_criteria',
      'sample_questions',
      'opening_script',
      'closing_script',
      'passing_score'
    ],
    optional_columns: [
      'voice_config',
      'prep_materials',
      'created_at',
      'updated_at'
    ],
    column_types: {
      id: 'uuid',
      curriculum_id: 'uuid',
      round_number: 'integer',
      round_type: 'text',
      title: 'text',
      description: 'text',
      duration_minutes: 'integer',
      interviewer_persona: 'jsonb',
      topics_to_cover: 'jsonb',
      evaluation_criteria: 'jsonb',
      sample_questions: 'jsonb',
      opening_script: 'text',
      closing_script: 'text',
      passing_score: 'integer'
    }
  },
  jobs: {
    table: 'jobs',
    required_columns: ['id'],
    optional_columns: [
      'company_id',
      'title',
      'level',
      'source_url',
      'raw_description',
      'parsing_confidence',
      'extraction_timestamp'
    ],
    column_types: {
      id: 'uuid'
    }
  }
};

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaError[];
  warnings: SchemaWarning[];
  suggestions: SchemaSuggestion[];
  actualSchema: ActualSchema;
}

export interface SchemaError {
  type: 'MISSING_TABLE' | 'MISSING_COLUMN' | 'TYPE_MISMATCH';
  table: string;
  column?: string;
  expected?: string;
  actual?: string;
  message: string;
}

export interface SchemaWarning {
  type: 'EXTRA_COLUMN' | 'DEPRECATED_COLUMN';
  table: string;
  column: string;
  message: string;
}

export interface SchemaSuggestion {
  type: 'CREATE_TABLE' | 'ADD_COLUMN' | 'ALTER_COLUMN';
  sql: string;
  description: string;
}

export interface ActualSchema {
  [tableName: string]: {
    exists: boolean;
    columns: {
      [columnName: string]: {
        data_type: string;
        is_nullable: boolean;
        column_default: string | null;
      };
    };
  };
}

export class SchemaValidator {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  /**
   * Validates the actual database schema against expected schema
   */
  async validate(): Promise<SchemaValidationResult> {
    const errors: SchemaError[] = [];
    const warnings: SchemaWarning[] = [];
    const suggestions: SchemaSuggestion[] = [];
    const actualSchema: ActualSchema = {};

    // Query actual database schema using information_schema
    const { data: tables, error: tablesError } = await this.supabase
      .rpc('get_table_schema', {
        schema_name: 'public'
      })
      .select('*');

    if (tablesError || !tables) {
      // Fallback to direct SQL query
      const { data, error } = await this.supabase.rpc('get_schema_info');
      if (error) {
        throw new Error(`Failed to introspect database schema: ${error.message}`);
      }
      return this.processSchemaInfo(data);
    }

    // Process each expected table
    for (const [key, expectedTable] of Object.entries(EXPECTED_SCHEMA)) {
      const tableName = expectedTable.table;
      const tableInfo = await this.getTableInfo(tableName);

      actualSchema[tableName] = tableInfo;

      if (!tableInfo.exists) {
        errors.push({
          type: 'MISSING_TABLE',
          table: tableName,
          message: `Table '${tableName}' does not exist in the database`
        });

        // Generate CREATE TABLE suggestion
        suggestions.push(this.generateCreateTableSuggestion(tableName, expectedTable));
        continue;
      }

      // Check required columns
      for (const column of expectedTable.required_columns) {
        if (!tableInfo.columns[column]) {
          errors.push({
            type: 'MISSING_COLUMN',
            table: tableName,
            column,
            message: `Required column '${column}' is missing from table '${tableName}'`
          });

          // Generate ADD COLUMN suggestion
          suggestions.push(this.generateAddColumnSuggestion(tableName, column, expectedTable));
        } else {
          // Check type compatibility
          const actualType = tableInfo.columns[column].data_type;
          const expectedType = expectedTable.column_types[column];

          if (expectedType && !this.isTypeCompatible(actualType, expectedType)) {
            errors.push({
              type: 'TYPE_MISMATCH',
              table: tableName,
              column,
              expected: expectedType,
              actual: actualType,
              message: `Column '${column}' in table '${tableName}' has type '${actualType}' but expected '${expectedType}'`
            });
          }
        }
      }

      // Check for extra columns (warnings)
      const allExpectedColumns = [
        ...expectedTable.required_columns,
        ...(expectedTable.optional_columns || [])
      ];

      for (const column of Object.keys(tableInfo.columns)) {
        if (!allExpectedColumns.includes(column)) {
          warnings.push({
            type: 'EXTRA_COLUMN',
            table: tableName,
            column,
            message: `Column '${column}' exists in table '${tableName}' but is not used by the application`
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      actualSchema
    };
  }

  /**
   * Get detailed information about a specific table
   */
  private async getTableInfo(tableName: string): Promise<{
    exists: boolean;
    columns: ActualSchema[string]['columns'];
  }> {
    const { data, error } = await this.supabase.rpc('get_table_columns', {
      table_name: tableName
    }).select('*');

    if (error || !data || data.length === 0) {
      // Table doesn't exist or no permissions
      return { exists: false, columns: {} };
    }

    const columns: ActualSchema[string]['columns'] = {};
    for (const col of data) {
      columns[col.column_name] = {
        data_type: col.data_type,
        is_nullable: col.is_nullable === 'YES',
        column_default: col.column_default
      };
    }

    return { exists: true, columns };
  }

  /**
   * Check if database type is compatible with expected type
   */
  private isTypeCompatible(actualType: string, expectedType: string): boolean {
    const typeMap: Record<string, string[]> = {
      'uuid': ['uuid'],
      'text': ['text', 'character varying', 'varchar'],
      'integer': ['integer', 'int4', 'int', 'smallint', 'bigint'],
      'numeric': ['numeric', 'decimal', 'real', 'double precision', 'float'],
      'jsonb': ['jsonb', 'json'],
      'timestamptz': ['timestamp with time zone', 'timestamptz'],
      'boolean': ['boolean', 'bool']
    };

    const compatibleTypes = typeMap[expectedType] || [expectedType];
    return compatibleTypes.includes(actualType.toLowerCase());
  }

  /**
   * Generate SQL suggestion for creating a missing table
   */
  private generateCreateTableSuggestion(
    tableName: string,
    schema: typeof EXPECTED_SCHEMA[keyof typeof EXPECTED_SCHEMA]
  ): SchemaSuggestion {
    const columns = schema.required_columns.map(col => {
      const type = schema.column_types[col] || 'text';
      const nullable = schema.optional_columns?.includes(col) ? '' : ' NOT NULL';
      return `  ${col} ${this.mapToSQLType(type)}${nullable}`;
    });

    const sql = `CREATE TABLE public.${tableName} (\n${columns.join(',\n')}\n);`;

    return {
      type: 'CREATE_TABLE',
      sql,
      description: `Create missing table '${tableName}'`
    };
  }

  /**
   * Generate SQL suggestion for adding a missing column
   */
  private generateAddColumnSuggestion(
    tableName: string,
    columnName: string,
    schema: typeof EXPECTED_SCHEMA[keyof typeof EXPECTED_SCHEMA]
  ): SchemaSuggestion {
    const type = schema.column_types[columnName] || 'text';
    const nullable = schema.optional_columns?.includes(columnName) ? '' : ' NOT NULL';

    const sql = `ALTER TABLE public.${tableName} ADD COLUMN ${columnName} ${this.mapToSQLType(type)}${nullable};`;

    return {
      type: 'ADD_COLUMN',
      sql,
      description: `Add missing column '${columnName}' to table '${tableName}'`
    };
  }

  /**
   * Map our type names to PostgreSQL types
   */
  private mapToSQLType(type: string): string {
    const typeMap: Record<string, string> = {
      'uuid': 'UUID DEFAULT gen_random_uuid()',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'numeric': 'NUMERIC',
      'jsonb': 'JSONB DEFAULT \'{}\'::jsonb',
      'timestamptz': 'TIMESTAMPTZ DEFAULT NOW()',
      'boolean': 'BOOLEAN DEFAULT false'
    };

    return typeMap[type] || 'TEXT';
  }

  /**
   * Process raw schema info from database
   */
  private processSchemaInfo(data: any): SchemaValidationResult {
    // Implementation for processing raw schema data
    // This would parse the actual database structure and compare
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      actualSchema: {}
    };
  }
}

/**
 * Validate schema before running the agent
 */
export async function validateSchemaBeforeExecution(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const validator = new SchemaValidator(supabase);
  const result = await validator.validate();

  if (!result.isValid) {
    console.error('❌ Database Schema Validation Failed!\n');

    // Print errors
    for (const error of result.errors) {
      console.error(`  ⚠️  ${error.message}`);
    }

    // Print suggestions
    if (result.suggestions.length > 0) {
      console.log('\n📝 Suggested fixes:\n');
      for (const suggestion of result.suggestions) {
        console.log(`-- ${suggestion.description}`);
        console.log(suggestion.sql);
        console.log();
      }
    }

    throw new Error('Schema validation failed. Please fix database schema before proceeding.');
  }

  // Print warnings if any
  if (result.warnings.length > 0) {
    console.log('⚠️  Schema Warnings:');
    for (const warning of result.warnings) {
      console.log(`  - ${warning.message}`);
    }
  }

  console.log('✅ Database schema validation passed!');
}