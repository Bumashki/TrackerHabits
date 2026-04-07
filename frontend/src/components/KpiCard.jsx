// Карточка с одним числовым показателем
// Props: label, value, sub, icon (FA-класс, опционально)
export default function KpiCard({ label, value, sub, icon }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && (
        <div className="kpi-sub">
          {icon && <i className={`fa-solid ${icon}`} style={{ marginRight: 4 }} />}
          {sub}
        </div>
      )}
    </div>
  )
}
