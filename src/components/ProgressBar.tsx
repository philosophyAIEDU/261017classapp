// 달성률 막대 그래프

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[15px]">
        <span className="font-semibold text-primary-900">{label}</span>
        <span className="font-extrabold text-primary-900">{value}%</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-primary-50" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-500 transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
