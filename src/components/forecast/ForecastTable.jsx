const statusClasses = {
  NORMAL: "bg-emerald-100 text-emerald-700",
  REVIEW: "bg-sky-100 text-sky-700",
  WARNING: "bg-amber-100 text-amber-800",
};

export default function ForecastTable({ rows }) {
  const hasRows = rows.length > 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-950">Forecast Task Table</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtered turbine forecast tasks with efficiency and variance tracking.
        </p>
      </div>

      {hasRows ? (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Date / Day</th>
                <th className="px-5 py-3 font-semibold">Turbine</th>
                <th className="px-5 py-3 font-semibold">Predicted MW</th>
                <th className="px-5 py-3 font-semibold">Actual MW</th>
                <th className="px-5 py-3 font-semibold">Efficiency</th>
                <th className="px-5 py-3 font-semibold">Variance</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={`${row.date}-${row.turbine}`} className="text-slate-700">
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="block font-semibold text-slate-950">{row.date}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-400">{row.day}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                    {row.turbine}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">{row.predicted}</td>
                  <td className="whitespace-nowrap px-5 py-4">{row.actual}</td>
                  <td className="whitespace-nowrap px-5 py-4">{row.efficiency}%</td>
                  <td className="whitespace-nowrap px-5 py-4">{row.variance}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[row.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-sm font-semibold text-slate-500">
          No forecast rows match the selected filters.
        </div>
      )}
    </section>
  );
}
