import React from 'react';
import { formatDisplayDate } from '../utils/dateUtils';
import { Globe, Handshake } from 'lucide-react';

const RevertPrintTemplate = React.forwardRef(({ revert }: { revert: any }, ref: React.Ref<HTMLDivElement>) => {
  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString, '');
  };

  const Row = ({ label, value }: { label: string, value: string }) => (
    <tr className="w-full">
      <td className="w-[35%] border-2 border-black p-2 pl-3 font-bold text-[12px] align-middle uppercase bg-gray-50" style={{printColorAdjust: 'exact'}}>
        {label}
      </td>
      <td className="w-[65%] border-2 border-black p-2 px-3 text-[13px] uppercase font-bold text-black">
        {value || ''}
      </td>
    </tr>
  );

  return (
    <div ref={ref} className="w-[794px] min-h-[1123px] mx-auto bg-white shadow-2xl print:shadow-none p-10 print:p-8 print:m-0 flex flex-col block relative box-border text-black shrink-0">
      
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

      <div className="w-full block border-y-[3px] border-black py-2 mb-3 text-center">
        <h1 className="text-[22px] font-black uppercase tracking-widest text-black">Balik-Islam (As'hab) Bio Data</h1>
      </div>

      {/* Serial Number & Official Registry Bar */}
      <div className="w-full flex justify-between items-center px-1 mb-4 text-[12px] font-bold text-black border-b border-black pb-1">
        <span>OFFICIAL REGISTRY RECORD</span>
        <span className="font-mono text-[13px]">SERIAL NO.: {revert?.serialNumber || 'N/A'}</span>
      </div>

      <div className="w-full block">
        <table className="w-full border-collapse border-2 border-black text-black table-fixed">
          <tbody>
            <tr className="w-full">
              <th colSpan={2} className="bg-black text-white text-center py-2 uppercase font-black tracking-widest text-[14px] border-2 border-black" style={{printColorAdjust: 'exact'}}>
                Personal Information
              </th>
            </tr>
            <Row label="Full Name" value={revert?.name} />
            <Row label="Date of Birth" value={formatDate(revert?.birthdate)} />
            <Row label="Sex" value={revert?.gender} />
            <Row label="Ethnicity" value={revert?.ethnicity} />
            <Row label="Civil Status" value={revert?.civilStatus} />
            <Row label="Complete Address" value={revert?.completeAddress} />
            <Row label="Contact Number" value={revert?.contactNumber} />
            <Row label="Facebook Account" value={revert?.facebookAccount} />
            <Row label="Email Address" value={revert?.emailAddress} />
            <Row label="Educational Background" value={revert?.educationalBackground} />
            <Row label="Profession (Job)" value={revert?.profession} />

            <tr className="w-full">
              <th colSpan={2} className="bg-black text-white text-center py-2 uppercase font-black tracking-widest text-[14px] border-2 border-black" style={{printColorAdjust: 'exact'}}>
                Islamic Information
              </th>
            </tr>
            <Row label="Muslim Name" value={revert?.muslimName} />
            <Row label="Date of Embracing Islam" value={formatDate(revert?.reversionDate)} />
            <Row label="Previous Religion" value={revert?.previousReligion} />
            <Row label="Da'eyah's Name (Preacher)" value={revert?.daeyahName} />
            <Row label="Islamic Center" value={revert?.islamicCenter} />
            
            <tr className="w-full">
              <td className="w-[35%] border-2 border-black p-2 pl-3 font-bold text-[12px] align-middle uppercase bg-gray-50" style={{printColorAdjust: 'exact'}}>
                Witness(es)
              </td>
              <td className="w-[65%] border-2 border-black p-0 align-top">
                <table className="w-full h-full min-h-[90px] border-collapse">
                  <tbody>
                    <tr className="w-full h-full">
                      <td className="w-[70%] border-r-2 border-black p-0 align-top h-full">
                        <div className="w-full h-full flex flex-col block">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={`p-1 px-3 w-full flex-1 flex items-center font-bold text-[13px] block ${i !== 2 ? 'border-b-2 border-black' : ''}`}>
                              {i + 1}. <span className="ml-2 uppercase">{revert?.witnesses?.[i] || ''}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="w-[30%] p-0 align-top h-full">
                        <div className="w-full h-full flex flex-col block">
                          <div className="w-full text-center font-bold text-[11px] uppercase border-b-2 border-black py-0.5 bg-gray-100 block" style={{printColorAdjust: 'exact'}}>
                            Signature
                          </div>
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={`w-full flex-1 block ${i !== 2 ? 'border-b-2 border-black' : ''}`}></div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="w-full mt-6 px-2 flex-1 flex flex-col block">
        <p className="text-[14px] text-black font-bold italic">
          "I hereby certify that the above information is true and correct to the best of my knowledge."
        </p>
        <div className="w-[280px] ml-auto text-center mr-4 mt-auto block">
          <div className="border-b-2 border-black text-center text-[16px] font-black pb-1 text-black uppercase min-h-[24px]">
            {revert?.name}
          </div>
          <p className="text-[12px] font-black uppercase pt-1 text-black">Signature Over Printed Name</p>
        </div>
      </div>

      <div className="w-full mt-8 pt-3 border-t-[3px] border-black text-center space-y-1 shrink-0 block">
        <p className="text-[12px] font-black text-black uppercase">AKBAR Bldg. 2nd Floor. Andres Alonzo Street. Brgy. RH 11, Cotabato City, BARMM, Philippines</p>
        <p className="text-[11px] font-bold text-black">0948 931 8137 (TNT) / 0935 025 5397 (TM) | email: aai.ic.cotcity@gmail.com</p>
      </div>
    </div>
  );
});

export default RevertPrintTemplate;
