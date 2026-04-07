// Столбчатый график
// Props:
//   data    — массив { label, value (0–100), muted, highlight }
//   height  — высота области графика в px (по умолчанию 80)
export default function BarChart({ data, height = 80 }) {
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="bar-col">
          <div
            className={`bar ${item.muted ? 'muted' : ''}`}
            style={{ height: `${item.value}%` }}
          />
          <span style={item.highlight ? { color: 'var(--accent)', fontWeight: 600 } : {}}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
