import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import Invoice from "../components/Invoice";
import Modal from "../components/Modal";
import { Badge, ErrorBox, Field, PageHeader, Spinner } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useDebounce, useLoad } from "../hooks/useLoad";
import { money } from "../utils/format";


const EMPTY_CUSTOMER = { name: "", phone: "", discount: "", method: "CASH", paid: "" };

export default function Billing() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const query = useDebounce(search);
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [paidTouched, setPaidTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);   // <- add this

  const { data: products, loading, error: loadError, reload } = useLoad(
    async () => (await api.get("/inventory/products/", { params: { search: query, active: "true" } })).data,
    [query]
  );

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + Number(l.product.selling_price) * l.quantity, 0), [cart]);
  const discount = Math.min(Math.max(Number(customer.discount) || 0, 0), subtotal);
  const total = subtotal - discount;

  // Paid amount follows the total until the cashier types their own value.
  useEffect(() => {
    if (!paidTouched) setCustomer((c) => ({ ...c, paid: total ? String(total) : "" }));
  }, [total, paidTouched]);

  const add = (product) => {
    setError("");
    setCart((lines) => {
      const found = lines.find((l) => l.product.id === product.id);
      if (found) {
        if (found.quantity >= product.stock) {
          toast.error(`Only ${product.stock} of ${product.name} in stock.`);
          return lines;
        }
        return lines.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stock < 1) {
        toast.error(`${product.name} is out of stock.`);
        return lines;
      }
      return [...lines, { product, quantity: 1 }];
    });
  };

  const change = (id, delta) =>
    setCart((lines) =>
      lines
        .map((l) => {
          if (l.product.id !== id) return l;
          const quantity = Math.min(l.quantity + delta, l.product.stock);
          return { ...l, quantity };
        })
        .filter((l) => l.quantity > 0)
    );
  const remove = (id) => setCart((lines) => lines.filter((l) => l.product.id !== id));

  const reset = () => {
    setCart([]);
    setCustomer(EMPTY_CUSTOMER);
    setPaidTouched(false);
    setError("");
  };

  const checkout = async () => {
    setError("");
    if (!cart.length) return setError("Add at least one product to the bill.");
    if (Number(customer.paid || 0) < total) return setError("Paid amount is less than the bill total.");
    setBusy(true);
    try {
      const { data } = await api.post("/sales/checkout/", {
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        customer_name: customer.name,
        customer_phone: customer.phone,
        discount: discount,
        payment_method: customer.method,
        paid_amount: Number(customer.paid || 0),
      });
      setReceipt(data);
      reset();
      reload(); // the backend reduced the stock - show fresh numbers
      toast.success(`Bill ${data.invoice_number} created.`);
    } catch (err) {
      setError(errorMessage(err));
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Billing (POS)" subtitle="Select products, take payment and print the bill" />
      <div className="pos">
        <section className="card">
          <input
            className="search"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ErrorBox message={loadError} onRetry={reload} />
          {loading && !products ? (
            <Spinner />
          ) : !products?.length ? (
            <div className="empty">No products found.</div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <button key={p.id} className="product-tile" disabled={p.stock < 1} onClick={() => add(p)}>
                  <strong>{p.name}</strong>
                  <small className="muted">{p.sku}</small>
                  <span className="price">{money(p.selling_price)}</span>
                  <Badge tone={p.stock < 1 ? "red" : p.is_low_stock ? "amber" : "green"}>
                    {p.stock < 1 ? "Out of stock" : `${p.stock} in stock`}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card cart">
          <h3>Current bill</h3>
          {!cart.length ? (
            <div className="empty">Tap a product to add it.</div>
          ) : (
            <ul className="cart-lines">
              {cart.map((l) => (
                <li key={l.product.id}>
                  <div className="cart-name">
                    <strong>{l.product.name}</strong>
                    <small className="muted">{money(l.product.selling_price)} each</small>
                  </div>
                  <div className="qty">
                    <button className="btn btn-small" onClick={() => change(l.product.id, -1)}>
                      −
                    </button>
                    <span>{l.quantity}</span>
                    <button className="btn btn-small" onClick={() => change(l.product.id, 1)}>
                      +
                    </button>
                  </div>
                  <strong className="line-total">{money(l.quantity * l.product.selling_price)}</strong>
                  <button className="icon-btn" onClick={() => remove(l.product.id)} aria-label="Remove">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="form-grid">
            <Field label="Customer name">
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </Field>
            <Field label="Customer phone">
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </Field>
            <Field label="Discount (₹)">
              <input type="number" min="0" value={customer.discount} onChange={(e) => setCustomer({ ...customer, discount: e.target.value })} />
            </Field>
            <Field label="Payment method">
              <select value={customer.method} onChange={(e) => setCustomer({ ...customer, method: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="MIXED">Mixed</option>
              </select>
            </Field>
            <Field label="Paid amount (₹)">
              <input
                type="number"
                min="0"
                value={customer.paid}
                onChange={(e) => {
                  setPaidTouched(true);
                  setCustomer({ ...customer, paid: e.target.value });
                }}
              />
            </Field>
          </div>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Discount</span>
              <span>- {money(discount)}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            {Number(customer.paid) > total && (
              <div>
                <span>Change to return</span>
                <span>{money(Number(customer.paid) - total)}</span>
              </div>
            )}
          </div>

          <ErrorBox message={error} />
          <div className="row-actions">
            <button className="btn" onClick={reset} disabled={busy || !cart.length}>
              Clear
            </button>
            <button className="btn btn-primary btn-grow" onClick={checkout} disabled={busy || !cart.length}>
              {busy ? "Processing..." : `Checkout ${money(total)}`}
            </button>
          </div>
        </section>
      </div>

      {receipt && (
        <Modal title={`Bill ${receipt.invoice_number}`} onClose={() => setReceipt(null)} wide>
          <div className="print-area">
            <Invoice sale={receipt} />
          </div>
          <div className="row-actions no-print">
            <button className="btn" onClick={() => setReceipt(null)}>
              New bill
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨 Print Bill
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
