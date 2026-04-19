using BankingPlatform.Infrastructure.Models.AccMasters;
using BankingPlatform.Infrastructure.Models.voucher;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BankingPlatform.Infrastructure.Configurations.Vouchers
{
    public class VoucherRDDetailConfiguration: IEntityTypeConfiguration<VoucherRDDetail>
    {
        public void Configure(EntityTypeBuilder<VoucherRDDetail> entity)
        {
            entity.HasKey(e => new { e.Id, e.BrId }).HasName("VoucherRDDetail_pkey");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

        }
    }
}
