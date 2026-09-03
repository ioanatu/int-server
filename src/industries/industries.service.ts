import { Injectable } from '@nestjs/common';
import { toSlug } from '../common/slug';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { IndustryDto, IndustryListDto } from './dto/industry.dto';

@Injectable()
export class IndustriesService {
  /**
   * Derived once on first use. The fixtures are immutable for the lifetime of the
   * process, so there is nothing to invalidate; a database-backed implementation
   * would replace this with a cached `SELECT DISTINCT ... GROUP BY`.
   */
  private industries?: IndustryDto[];

  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  findAll(): IndustryListDto {
    const data = this.getIndustries();
    return { data, total: data.length };
  }

  /**
   * Industries are derived from the supplier records rather than kept in a separate
   * list, so the filter values this endpoint advertises can never drift out of sync
   * with what is actually filterable.
   */
  private getIndustries(): IndustryDto[] {
    if (this.industries) {
      return this.industries;
    }

    const byId = new Map<string, { name: string; supplierCount: number }>();
    for (const supplier of this.suppliersRepository.findAllSummaries()) {
      const id = toSlug(supplier.industry);
      const existing = byId.get(id);
      if (existing) {
        existing.supplierCount += 1;
      } else {
        byId.set(id, { name: supplier.industry, supplierCount: 1 });
      }
    }

    this.industries = [...byId.entries()]
      .map(([id, { name, supplierCount }]) => ({ id, name, supplierCount }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return this.industries;
  }
}
