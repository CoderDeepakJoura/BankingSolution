using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BankingPlatform.Infrastructure.Models;

[PrimaryKey("id", "branchid")]
public partial class User
{
    [Key]
    public int id { get; set; }

    public int branchid { get; set; }

    public string username { get; set; } = null!;

    public string password { get; set; } = ""!;
    public int isauthorized { get; set; }
    public int issu { get; set; }
    public int isbranchsu { get; set; }
    public int usertype { get; set; }
}
