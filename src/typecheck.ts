/**
 * Type checking for Elo
 *
 * This module provides optional static type checking for Elo expressions.
 * It analyzes the IR to detect type mismatches and operations involving
 * the 'any' type.
 */

import { EloType, typeName } from './types';

/**
 * Category of type warning
 */
export type TypeWarningCategory = 'type_mismatch' | 'unknown_function' | 'any_type';

/**
 * A type warning detected during transformation
 */
export interface TypeWarning {
  message: string;
  category: TypeWarningCategory;
}

/**
 * Collector for type warnings during transformation
 */
export class TypeCheckCollector {
  readonly warnings: TypeWarning[] = [];

  /**
   * Warn when no matching signature exists for a function call
   */
  warnTypeMismatch(fn: string, argTypes: EloType[]): void {
    const signature = formatSignature(fn, argTypes);
    this.warnings.push({
      message: `No matching signature for ${signature}`,
      category: 'type_mismatch',
    });
  }

  /**
   * Warn when an unknown function is called
   */
  warnUnknownFunction(name: string): void {
    this.warnings.push({
      message: `Unknown function '${name}'`,
      category: 'unknown_function',
    });
  }

  /**
   * Warn when an operation involves the 'any' type
   */
  warnAnyType(fn: string, argTypes: EloType[]): void {
    const signature = formatSignature(fn, argTypes);
    this.warnings.push({
      message: `Operation involves 'any' type: ${signature}`,
      category: 'any_type',
    });
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}

/**
 * Format a function signature for display
 */
function formatSignature(fn: string, argTypes: EloType[]): string {
  const typeNames = argTypes.map(typeName).join(', ');
  return `${fn}(${typeNames})`;
}
