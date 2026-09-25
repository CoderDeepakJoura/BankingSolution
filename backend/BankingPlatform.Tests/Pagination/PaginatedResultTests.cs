using BankingPlatform.API.Common;

namespace BankingPlatform.Tests.Pagination;

public class PaginatedResultTests
{
    [Fact]
    public void From_ReturnsCorrectPage()
    {
        var items = Enumerable.Range(1, 50).ToList();

        var page1 = PaginatedResult<int>.From(items, page: 1, pageSize: 10);

        page1.Items.Should().HaveCount(10);
        page1.Items.First().Should().Be(1);
        page1.Items.Last().Should().Be(10);
        page1.TotalCount.Should().Be(50);
        page1.TotalPages.Should().Be(5);
        page1.HasPrevious.Should().BeFalse();
        page1.HasNext.Should().BeTrue();
    }

    [Fact]
    public void From_LastPage_HasNoNext()
    {
        var items = Enumerable.Range(1, 25).ToList();
        var page3 = PaginatedResult<int>.From(items, page: 3, pageSize: 10);

        page3.Items.Should().HaveCount(5);
        page3.HasNext.Should().BeFalse();
        page3.HasPrevious.Should().BeTrue();
    }

    [Fact]
    public void From_PageBeyondRange_ReturnsEmpty()
    {
        var items = Enumerable.Range(1, 10).ToList();
        var page5 = PaginatedResult<int>.From(items, page: 5, pageSize: 10);

        page5.Items.Should().BeEmpty();
        page5.TotalCount.Should().Be(10);
    }

    [Fact]
    public void From_PageSizeZero_ClampsToOne()
    {
        var items = Enumerable.Range(1, 5).ToList();
        var result = PaginatedResult<int>.From(items, page: 1, pageSize: 0);

        result.PageSize.Should().Be(1);
    }

    [Fact]
    public void From_PageSizeOverMax_ClampsTo500()
    {
        var items = Enumerable.Range(1, 600).ToList();
        var result = PaginatedResult<int>.From(items, page: 1, pageSize: 1000);

        result.PageSize.Should().Be(500);
        result.Items.Should().HaveCount(500);
    }

    [Fact]
    public void FromPage_ReturnsCorrectMetadata()
    {
        var pageItems = Enumerable.Range(11, 10).ToList();
        var result = PaginatedResult<int>.FromPage(pageItems, page: 2, pageSize: 10, totalCount: 100);

        result.Page.Should().Be(2);
        result.TotalPages.Should().Be(10);
        result.TotalCount.Should().Be(100);
        result.HasPrevious.Should().BeTrue();
        result.HasNext.Should().BeTrue();
    }
}
