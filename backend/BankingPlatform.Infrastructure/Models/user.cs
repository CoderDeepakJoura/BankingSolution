using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.Infrastructure.Models;

[PrimaryKey("id", "branchcode")]
public partial class user
{
    [Key]
    public int id { get; set; }

    [Key]
    public string branchcode { get; set; } = null!;

    public string username { get; set; } = null!;

    public string? password { get; set; }
}
