interface Props {
  domain: [string, string];
  widthPx: number;
  tickYears?: number[]; // absolute years to render ticks on
}

export function TimeAxis({ domain, widthPx, tickYears }: Props) {
  const startYear = new Date(domain[0]).getUTCFullYear();
  const endYear = new Date(domain[1]).getUTCFullYear();
  const defaultTicks: number[] = [];
  for (let y = Math.ceil(startYear / 5) * 5; y <= endYear; y += 5) {
    defaultTicks.push(y);
  }
  const ticks = tickYears ?? defaultTicks;
  const domainT0 = new Date(domain[0]).getTime();
  const domainT1 = new Date(domain[1]).getTime();

  return (
    <div
      className="relative select-none"
      style={{ width: widthPx, height: 28 }}
      aria-label={`Time axis from ${startYear} to ${endYear}`}
    >
      <div className="absolute left-0 right-0 top-[22px] h-px bg-slate-300" />
      {ticks.map((year) => {
        const t = new Date(`${year}-01-01`).getTime();
        const x = ((t - domainT0) / (domainT1 - domainT0)) * widthPx;
        return (
          <div key={year} className="absolute" style={{ left: x, top: 0 }}>
            <div className="text-[10px] font-medium text-slate-500 -translate-x-1/2">
              {year}
            </div>
            <div className="absolute top-[22px] h-1.5 w-px bg-slate-400 -translate-x-px" />
          </div>
        );
      })}
    </div>
  );
}
