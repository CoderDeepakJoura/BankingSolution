import Swal from 'sweetalert2';

export interface UsageInfo {
  screen: string;
  count: number;
}

export function isMasterInUseError(err: any): err is Error & { usages: UsageInfo[] } {
  return err?.inUse === true && Array.isArray(err?.usages);
}

export async function showMasterInUseError(usages: UsageInfo[], itemName = 'this record'): Promise<void> {
  const rows = usages
    .map(u => `<tr>
      <td style="padding:6px 12px;text-align:left;font-weight:600">${u.screen}</td>
      <td style="padding:6px 12px;text-align:center;color:#dc2626">${u.count} record${u.count !== 1 ? 's' : ''}</td>
    </tr>`)
    .join('');

  await Swal.fire({
    icon: 'warning',
    title: 'Cannot Delete',
    html: `<p style="margin-bottom:12px">
             <b>${itemName.charAt(0).toUpperCase() + itemName.slice(1)}</b> is currently in use and cannot be deleted.
           </p>
           <table style="width:100%;border-collapse:collapse;font-size:14px">
             <thead>
               <tr style="background:#f3f4f6">
                 <th style="padding:6px 12px;text-align:left">Used In</th>
                 <th style="padding:6px 12px;text-align:center">Records</th>
               </tr>
             </thead>
             <tbody>${rows}</tbody>
           </table>`,
    confirmButtonColor: '#6b7280',
    confirmButtonText: 'OK',
  });
}
