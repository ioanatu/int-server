import { Injectable } from '@nestjs/common';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { CountryOptionDto, CountryOptionListDto } from './dto/country.dto';

@Injectable()
export class CountriesService {
  /**
   * Derived once on first use. The fixtures are immutable for the lifetime of the
   * process, so there is nothing to invalidate; a database-backed implementation
   * would replace this with a cached `SELECT DISTINCT ... GROUP BY`.
   */
  private countries?: CountryOptionDto[];

  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  findAll(): CountryOptionListDto {
    const data = this.getCountries();
    return { data, total: data.length };
  }

  /**
   * Countries are derived from the supplier records rather than from a full ISO list,
   * so the filter only ever advertises values that actually match something. The ISO
   * alpha-2 code doubles as the id: it is already stable and URL-safe, so no slug is
   * needed the way it is for industry names.
   */
  private getCountries(): CountryOptionDto[] {
    if (this.countries) {
      return this.countries;
    }

    const byId = new Map<string, { name: string; supplierCount: number }>();
    for (const supplier of this.suppliersRepository.findAllSummaries()) {
      const id = supplier.country.code.toUpperCase();
      const existing = byId.get(id);
      if (existing) {
        existing.supplierCount += 1;
      } else {
        byId.set(id, { name: supplier.country.name, supplierCount: 1 });
      }
    }

    this.countries = [...byId.entries()]
      .map(([id, { name, supplierCount }]) => ({ id, name, supplierCount }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return this.countries;
  }
}
