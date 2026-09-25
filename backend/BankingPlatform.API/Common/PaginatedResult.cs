namespace BankingPlatform.API.Common;

/// <summary>
/// Wraps a page of results with pagination metadata.
/// </summary>
public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;

    public static PaginatedResult<T> From(IEnumerable<T> source, int page, int pageSize)
    {
        var list = source.ToList();
        int total = list.Count;
        int safePage = Math.Max(1, page);
        int safeSize = Math.Clamp(pageSize, 1, 500);
        var items = list.Skip((safePage - 1) * safeSize).Take(safeSize).ToList();
        return new PaginatedResult<T>
        {
            Items = items,
            Page = safePage,
            PageSize = safeSize,
            TotalCount = total
        };
    }

    /// <summary>
    /// Use this overload when you already have the total count from a separate DB query
    /// and want to avoid materialising the full result set in memory.
    /// </summary>
    public static PaginatedResult<T> FromPage(List<T> pageItems, int page, int pageSize, int totalCount)
    {
        return new PaginatedResult<T>
        {
            Items = pageItems,
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 500),
            TotalCount = totalCount
        };
    }
}
