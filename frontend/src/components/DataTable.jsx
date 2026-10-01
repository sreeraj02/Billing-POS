import { Spinner } from "./UI";

/**
 * columns: [{ key, label, render?(row), className? }]
 * On narrow containers (phones / the mobile admin frame) rows turn into cards using data-label.
 */
export default function DataTable({ columns, rows, loading, empty = "Nothing to show yet." }) {
  if (loading && !rows?.length) return <Spinner />;
  if (!rows?.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.className}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} className={c.className}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
