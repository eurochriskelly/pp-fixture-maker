import React from 'react';
import LocationsReport from './LocationsReport';
import ByTeam from './ByTeam';
import ByPitch from './ByPitch';

const ReportsPrint: React.FC = () => {
  return (
    <div className="space-y-10">
      <style>{`
        @media print {
          .print-page-break-before {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
      <section className="space-y-4 ">
        <div className="rounded-xl border-2 border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-wide">Locations</h1>
        </div>
        <LocationsReport embedded />
      </section>

      <section className="space-y-4 print-page-break-before">
        <div className="rounded-xl border-2 border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-wide">Fixtures By Team</h1>
        </div>
        <ByTeam />
      </section>

      <section className="space-y-4 print-page-break-before">
        <div className="rounded-xl border-2 border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-wide">Fixtures By Pitch</h1>
        </div>
        <ByPitch />
      </section>
    </div>
  );
};

export default ReportsPrint;
