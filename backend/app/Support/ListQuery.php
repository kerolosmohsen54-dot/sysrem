<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ListQuery
{
    /**
     * @return array{data: array, meta: array{current_page: int, last_page: int, per_page: int, total: int}}
     */
    public static function page(LengthAwarePaginator $page): array
    {
        return [
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $sortable
     * @param  array<string, array<int, string>>  $additionalRules
     * @return array<string, mixed>
     */
    public static function validate(Request $request, array $sortable, array $additionalRules = []): array
    {
        return $request->validate([
            ...$additionalRules,
            'page' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'min:1', 'max:160'],
            'sort_by' => ['sometimes', 'string', Rule::in(array_keys($sortable))],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  list<string>  $columns
     */
    public static function search(Builder $query, array $filters, array $columns): Builder
    {
        if (! isset($filters['search'])) {
            return $query;
        }

        $search = '%'.$filters['search'].'%';

        return $query->where(function (Builder $matches) use ($columns, $search): void {
            foreach ($columns as $index => $column) {
                if ($index === 0) {
                    $matches->where($column, 'like', $search);

                    continue;
                }

                $matches->orWhere($column, 'like', $search);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<string, string>  $sortable
     */
    public static function sort(
        Builder $query,
        array $filters,
        array $sortable,
        string $default,
        string|array $tieBreakers = 'id',
        string $defaultDirection = 'asc',
    ): Builder {
        $column = $sortable[$filters['sort_by'] ?? $default];
        $direction = $filters['sort_direction'] ?? $defaultDirection;
        $query->orderBy($column, $direction);

        foreach ((array) $tieBreakers as $tieBreaker) {
            if ($column !== $tieBreaker) {
                $query->orderBy($tieBreaker, $direction);
            }
        }

        return $query;
    }
}
