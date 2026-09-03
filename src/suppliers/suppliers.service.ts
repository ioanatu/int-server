import { Injectable, NotFoundException } from '@nestjs/common';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { PaginatedSuppliersDto, SupplierListItemDto } from './dto/supplier-list-item.dto';
import { SupplierDetailDto } from './dto/supplier-detail.dto';
import { toSlug } from '../common/slug';
import { SuppliersRepository } from './suppliers.repository';
import type { SupplierListRecord } from './supplier.types';

@Injectable()
export class SuppliersService {
  constructor(private readonly repository: SuppliersRepository) {}

  /**
   * Applies search, filters and pagination over the supplier fixtures.
   *
   * Filters are combined with AND; every one of them is optional. Ordering is the
   * fixture's own (stable) order so pagination is repeatable across requests.
   */
  findAll(query: ListSuppliersQueryDto): PaginatedSuppliersDto {
    const { search, country, status, riskLevel, assessmentStatus, industry, page, limit } = query;

    const needle = search?.toLowerCase();
    // Slugifying both sides lets the filter accept the id served by
    // GET /api/v1/industries ("food-beverage") or the display name
    // ("Food & Beverage"), in any casing, with one comparison.
    const industryId = industry ? toSlug(industry) : undefined;

    const matches = this.repository.findAllSummaries().filter((supplier) => {
      if (needle && !SuppliersService.matchesSearch(supplier, needle)) {
        return false;
      }
      if (country && supplier.country.code.toUpperCase() !== country) {
        return false;
      }
      if (status && supplier.relationship.status !== status) {
        return false;
      }
      if (riskLevel && supplier.risk.level !== riskLevel) {
        return false;
      }
      if (assessmentStatus && supplier.assessment.status !== assessmentStatus) {
        return false;
      }
      if (industryId && toSlug(supplier.industry) !== industryId) {
        return false;
      }
      return true;
    });

    const total = matches.length;
    const offset = (page - 1) * limit;
    const data = matches.slice(offset, offset + limit).map(SuppliersService.toListItem);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasNext: offset + data.length < total,
      },
    };
  }

  /** @throws NotFoundException when no supplier carries the given id. */
  findOne(supplierId: string): SupplierDetailDto {
    const supplier = this.repository.findDetailById(supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier with id '${supplierId}' was not found.`);
    }
    return supplier;
  }

  /** Free-text search across the fields a procurement user would type into a search box. */
  private static matchesSearch(supplier: SupplierListRecord, needle: string): boolean {
    return [
      supplier.id,
      supplier.name,
      supplier.industry,
      supplier.country.name,
      supplier.country.code,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  }

  /** Projects the stored summary onto the flatter list contract. */
  private static toListItem(supplier: SupplierListRecord): SupplierListItemDto {
    return {
      id: supplier.id,
      name: supplier.name,
      country: supplier.country.code,
      status: supplier.relationship.status,
      risk: { level: supplier.risk.level, score: supplier.risk.score },
    };
  }
}
