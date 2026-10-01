import api from "../api/client";
import DataTable from "../components/DataTable";
import { Badge, ErrorBox, PageHeader, Spinner, StatCard } from "../components/UI";
import { useLoad } from "../hooks/useLoad";
import { dateOnly, dateTime, money } from "../utils/format";

export default function Dashboard() {
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/sales/dashboard/")).data);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;

  const max = Math.max(1, ...data.last_7_days.map((d) => d.amount));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live overview of today's business">
        <button className="btn" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      <div className="stat-grid">
        <StatCard label="Today's sales" value={money(data.today_sales)} tone="blue" />
        <StatCard label="Today's bills" value={data.today_bills} tone="green" />
        <StatCard label="Today's returns" value={money(data.today_returns)} />
        <StatCard label="Products" value={`${data.active_products} / ${data.total_products}`} />
        <StatCard label="Low stock" value={data.low_stock_count} tone={data.low_stock_count ? "red" : undefined} />
        <StatCard label="Out of stock" value={data.out_of_stock_count} tone={data.out_of_stock_count ? "red" : undefined} />
        <StatCard label="Stock value (cost)" value={money(data.inventory_value)} />
        <StatCard label="Active staff" value={data.total_staff} />
      </div>

      <div className="card">
        <h3>Last 7 days</h3>
        <div className="bars">
          {data.last_7_days.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.bills} bills`}>
              <span className="bar-value">{d.amount ? money(d.amount) : "-"}</span>
              <div className="bar" style={{ height: `${Math.max(4, (d.amount / max) * 100)}px` }} />
              <small>{dateOnly(d.date)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Low stock products</h3>
          <DataTable
            rows={data.low_stock_products}
            empty="All products are well stocked."
            columns={[
              { key: "name", label: "Product" },
              { key: "sku", label: "SKU" },
              { key: "stock", label: "Stock", render: (p) => <Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock}</Badge> },
              { key: "reorder_level", label: "Reorder at" },
            ]}
          />
        </div>
        <div className="card">
          <h3>Recent bills</h3>
          <DataTable
            rows={data.recent_bills}
            empty="No bills yet."
            columns={[
              { key: "invoice_number", label: "Invoice" },
              { key: "created_at", label: "Date", render: (s) => dateTime(s.created_at) },
              { key: "total", label: "Total", render: (s) => money(s.total) },
            ]}
          />
        </div>
      </div>
    </>
  );
}
