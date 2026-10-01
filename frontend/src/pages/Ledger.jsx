import { useState } from "react";
import api from "../api/client";
import DataTable from "../components/DataTable";
import { Badge, ErrorBox, PageHeader, StatCard } from "../components/UI";
import { useLoad } from "../hooks/useLoad";
import { dateTime, money } from "../utils/format";
import { asList } from "../utils/list";

export default function Ledger() {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, loading, error, reload } = useLoad(
    async () => (await api.get("/sales/ledger/", { params: { entry_type: type, date_from: from, date_to: to } })).data,
    [type, from, to]
  );

  const received = (data || []).reduce((s, e) => s + Number(e.credit), 0);
  const refunded = (data || []).reduce((s, e) => s + Number(e.debit), 0);

  return (
    <>
      <PageHeader title="Sales ledger" subtitle="Every sale (credit) and refund (debit)" />
      <div className="stat-grid">
        <StatCard label="Total received (Cr)" value={money(received)} tone="green" />
        <StatCard label="Total refunded (Dr)" value={money(refunded)} tone="red" />
        <StatCard label="Net" value={money(received - refunded)} tone="blue" />
      </div>
      <div className="card">
        <div className="filters">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Sales and returns</option>
            <option value="SALE">Sales only</option>
            <option value="RETURN">Returns only</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={asList(data)}
          empty="No ledger entries."
          columns={[
            { key: "created_at", label: "Date", render: (e) => dateTime(e.created_at) },
            { key: "entry_type", label: "Type", render: (e) => <Badge tone={e.entry_type === "SALE" ? "green" : "amber"}>{e.entry_type}</Badge> },
            { key: "description", label: "Description" },
            { key: "debit", label: "Debit", className: "num", render: (e) => (Number(e.debit) ? money(e.debit) : "-") },
            { key: "credit", label: "Credit", className: "num", render: (e) => (Number(e.credit) ? money(e.credit) : "-") },
          ]}
        />
      </div>
    </>
  );
}
