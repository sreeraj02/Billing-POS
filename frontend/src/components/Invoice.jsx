import { dateTime, money } from "../utils/format";

// Printable bill. Wrapped by `.print-area` so window.print() only prints this block.
export default function Invoice({ sale }) {
  return (
    <div className="invoice">
      <div className="invoice-head">
        <h2>POS Billing Software</h2>
        <p>Tax Invoice / Cash Memo</p>
      </div>
      <div className="invoice-meta">
        <div>
          <strong>Invoice:</strong> {sale.invoice_number}
        </div>
        <div>
          <strong>Date:</strong> {dateTime(sale.created_at)}
        </div>
        <div>
          <strong>Staff:</strong> {sale.created_by_name}
        </div>
        <div>
          <strong>Customer:</strong> {sale.customer_name || "Walk-in customer"}
          {sale.customer_phone ? ` (${sale.customer_phone})` : ""}
        </div>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Price</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.product_name}
                <small> ({item.sku})</small>
              </td>
              <td className="num">{item.quantity}</td>
              <td className="num">{money(item.unit_price)}</td>
              <td className="num">{money(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-totals">
        <div>
          <span>Subtotal</span>
          <span>{money(sale.subtotal)}</span>
        </div>
        <div>
          <span>Discount</span>
          <span>- {money(sale.discount)}</span>
        </div>
        <div className="grand">
          <span>Grand total</span>
          <span>{money(sale.total)}</span>
        </div>
        <div>
          <span>Payment method</span>
          <span>{sale.payment_method}</span>
        </div>
        <div>
          <span>Paid amount</span>
          <span>{money(sale.paid_amount)}</span>
        </div>
        {sale.change_due > 0 && (
          <div>
            <span>Change returned</span>
            <span>{money(sale.change_due)}</span>
          </div>
        )}
      </div>
      <p className="invoice-thanks">Thank you for shopping with us! Visit again.</p>
    </div>
  );
}
