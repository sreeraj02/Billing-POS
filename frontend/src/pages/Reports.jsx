import { useState } from "react";
import api from "../api/client";
import DataTable from "../components/DataTable";
import { ErrorBox, PageHeader, Spinner, StatCard } from "../components/UI";
import { useLoad } from "../hooks/useLoad";
import { dateOnly, isoDate, money } from "../utils/format";


export default function Reports() {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const { data, loading, error, reload } = useLoad(
    async () => (await api.get("/sales/reports/sales/", { params: { date_from: from, date_to: to } })).data,
    [from, to]
  );
  const max = Math.max(1, ...(data?.daily_sales || []).map((d) => d.amount));

  return (
    <>
      <PageHeader title="Sales report" subtitle="Summary for the selected period">
        <div className="filters inline">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
      </PageHeader>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? (
        <Spinner />
      ) : (
        data && (
          <>
            <div className="stat-grid">
              <StatCard label="Total bills" value={data.total_bills} />
              <StatCard label="Total sales" value={money(data.total_sales)} tone="blue" />
              <StatCard label="Total discounts" value={money(data.total_discounts)} />
              <StatCard label="Average bill" value={money(data.average_bill_value)} />
              <StatCard label={`Returns (${data.return_count})`} value={money(data.total_returns)} tone="red" />
              <StatCard label="Net sales" value={money(data.net_sales)} tone="green" />
            </div>

            <div className="two-col">
              <div className="card">
                <h3>By payment method</h3>
                <DataTable
                  rows={data.by_payment_method.map((r) => ({ ...r, id: r.payment_method }))}
                  empty="No sales in this period."
                  columns={[
                    { key: "payment_method", label: "Method" },
                    { key: "bills", label: "Bills" },
                    { key: "amount", label: "Amount", className: "num", render: (r) => money(r.amount) },
                  ]}
                />
              </div>
              <div className="card">
                <h3>Top products</h3>
                <DataTable
                  rows={data.top_products.map((r) => ({ ...r, id: r.product_id }))}
                  empty="No sales in this period."
                  columns={[
                    { key: "name", label: "Product" },
                    { key: "quantity", label: "Qty sold" },
                    { key: "revenue", label: "Revenue", className: "num", render: (r) => money(r.revenue) },
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <h3>Daily sales</h3>
              {!data.daily_sales.length ? (
                <div className="empty">No sales in this period.</div>
              ) : (
                <div className="hbars">
                  {data.daily_sales.map((d) => (
                    <div key={d.date} className="hbar-row">
                      <span className="hbar-date">{dateOnly(d.date)}</span>
                      <div className="hbar-track">
                        <div className="hbar" style={{ width: `${Math.max(2, (d.amount / max) * 100)}%` }} />
                      </div>
                      <span className="hbar-amount">
                        {money(d.amount)} <small className="muted">({d.bills})</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
