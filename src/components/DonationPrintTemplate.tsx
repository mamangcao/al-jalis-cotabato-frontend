import React from 'react';
import { formatDisplayDate } from '../utils/dateUtils';
import { Globe, Handshake } from 'lucide-react';

const DonationPrintTemplate = React.forwardRef(({ donations, dateSubtitle, totalAmount }: { donations: any[], dateSubtitle: string, totalAmount: number }, ref: React.Ref<HTMLDivElement>) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  return (
    <div ref={ref} className="w-[794px] min-h-[1123px] mx-auto bg-white text-black shadow-2xl print:shadow-none p-10 print:p-8 print:m-0 flex flex-col block relative box-border shrink-0">
      
      {/* Header */}
      <div className="w-full block relative mb-6 min-h-[100px]">
        <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-[3px] border-black flex flex-col items-center justify-center bg-white z-10 overflow-hidden pt-1">
          <Globe size={36} className="text-black mb-0.5" strokeWidth={1.5} />
          <Handshake size={32} className="text-black" strokeWidth={1.5} />
        </div>
        
        <div className="text-center w-full block space-y-1 relative z-0">
          <p className="font-serif text-[26px] font-bold" style={{fontFamily: 'Traditional Arabic, serif'}}>بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <p className="italic text-[13px] text-black">In the Name of Allah, The Most Gracious, The Most Merciful</p>
          <div className="pt-2 space-y-0.5">
            <h2 className="text-[26px] leading-none font-black uppercase text-black">Al-Jalis As-Salih</h2>
            <h3 className="text-[20px] leading-tight font-black uppercase text-black">The Good Companion Inc.</h3>
            <p className="text-[12px] font-bold text-black">SEC REG. NO. CN201616121</p>
            <p className="text-[14px] font-black uppercase mt-1 text-black tracking-wide">Islamic Center - Cotabato City</p>
          </div>
        </div>
      </div>

      <div className="w-full block border-y-[3px] border-black py-2 mb-2 text-center">
        <h1 className="text-[22px] font-black uppercase tracking-widest text-black">Donation History Report</h1>
      </div>
      <div className="w-full block mb-6 text-center">
        <p className="text-[14px] font-bold text-black uppercase tracking-wide">Period: {dateSubtitle}</p>
      </div>

      <div className="w-full block flex-1">
        <table className="w-full border-collapse border-2 border-black text-black">
          <thead>
            <tr className="bg-gray-100" style={{printColorAdjust: 'exact'}}>
              <th className="border-2 border-black p-2 text-left font-black uppercase text-[12px]">Date</th>
              <th className="border-2 border-black p-2 text-left font-black uppercase text-[12px]">Donor</th>
              <th className="border-2 border-black p-2 text-left font-black uppercase text-[12px]">Category</th>
              <th className="border-2 border-black p-2 text-left font-black uppercase text-[12px]">Campaign</th>
              <th className="border-2 border-black p-2 text-right font-black uppercase text-[12px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation, idx) => (
              <tr key={idx}>
                <td className="border-2 border-black p-2 text-[12px] font-medium uppercase">{formatDisplayDate(donation.date)}</td>
                <td className="border-2 border-black p-2 text-[12px] font-medium uppercase">{donation.donorName}</td>
                <td className="border-2 border-black p-2 text-[12px] font-medium uppercase">{donation.category}</td>
                <td className="border-2 border-black p-2 text-[12px] font-medium uppercase">{donation.campaignTitle || '-'}</td>
                <td className="border-2 border-black p-2 text-[12px] font-bold text-right">{formatCurrency(donation.amount)}</td>
              </tr>
            ))}
            {donations.length === 0 && (
              <tr>
                <td colSpan={5} className="border-2 border-black p-4 text-center text-[12px] italic">No donations found for this period.</td>
              </tr>
            )}
            <tr className="bg-gray-100" style={{printColorAdjust: 'exact'}}>
              <td colSpan={4} className="border-2 border-black p-2 text-right font-black uppercase text-[13px]">
                Overall Total:
              </td>
              <td className="border-2 border-black p-2 text-right font-black text-[14px]">
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="w-full mt-8 pt-3 border-t-[3px] border-black text-center space-y-1 shrink-0 block">
        <p className="text-[12px] font-black text-black uppercase">AKBAR Bldg. 2nd Floor. Andres Alonzo Street. Brgy. RH 11, Cotabato City, BARMM, Philippines</p>
        <p className="text-[11px] font-bold text-black">0948 931 8137 (TNT) / 0935 025 5397 (TM) | email: aai.ic.cotcity@gmail.com</p>
      </div>
    </div>
  );
});

export default DonationPrintTemplate;
