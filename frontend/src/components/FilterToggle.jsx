export default function FilterToggle({ value, onChange }) {
  const options = [
    { value: "24h", label: "24 Hours" },
    { value: "7d", label: "7 Days" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
