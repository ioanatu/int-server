import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupplierDetailMap, SupplierDetailRecord, SupplierListRecord } from './supplier.types';

/**
 * Stands in for the persistence layer this PoC deliberately does not have.
 *
 * The two JSON fixtures are read from disk once at bootstrap and kept in memory:
 * the dataset is small and immutable, and reading it per request would add I/O
 * latency without buying anything. Swapping this class for a real database
 * repository is the only change the service layer should ever need.
 */
@Injectable()
export class SuppliersRepository implements OnModuleInit {
  private readonly logger = new Logger(SuppliersRepository.name);

  /**
   * Resolves to `src/data` under ts-node/Jest and to `dist/data` in a built
   * artifact, because `nest-cli.json` copies the fixtures next to the output.
   */
  private readonly dataDir = join(__dirname, '..', 'data');

  private summaries: SupplierListRecord[] = [];
  private details: SupplierDetailMap = {};

  onModuleInit(): void {
    this.summaries = this.readJsonFile<SupplierListRecord[]>('suppliers.json');
    this.details = this.readJsonFile<SupplierDetailMap>('supplier.json');
    this.logger.log(
      `Loaded ${this.summaries.length} supplier summaries and ` +
        `${Object.keys(this.details).length} supplier details from ${this.dataDir}`,
    );
  }

  /** All supplier summaries, in file order. */
  findAllSummaries(): SupplierListRecord[] {
    return this.summaries;
  }

  /** Full record for a supplier, or `undefined` when the id is unknown. */
  findDetailById(supplierId: string): SupplierDetailRecord | undefined {
    // Guard against prototype keys ("__proto__", "constructor") reaching the lookup.
    if (!Object.prototype.hasOwnProperty.call(this.details, supplierId)) {
      return undefined;
    }
    return this.details[supplierId];
  }

  private readJsonFile<T>(fileName: string): T {
    const filePath = join(this.dataDir, fileName);
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as T;
    } catch (error) {
      this.logger.error(`Failed to read fixture ${filePath}`);
      throw error;
    }
  }
}
