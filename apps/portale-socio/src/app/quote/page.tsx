"use client";

import { CreditCard, Download, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface Quota {
  id: string;
  descrizione: string;
  importo: number;
  scadenza: string;
  stato: "pagata" | "in_sospeso" | "scaduta";
  dataPagamento?: string;
  ricevutaUrl?: string;
}

const quote: Quota[] = [
  {
    id: "q1",
    descrizione: "Quota mensile Aprile 2026",
    importo: 45.0,
    scadenza: "30/04/2026",
    stato: "in_sospeso",
  },
  {
    id: "q2",
    descrizione: "Quota mensile Marzo 2026",
    importo: 45.0,
    scadenza: "31/03/2026",
    stato: "pagata",
    dataPagamento: "15/03/2026",
    ricevutaUrl: "#",
  },
  {
    id: "q3",
    descrizione: "Iscrizione annuale 2025/2026",
    importo: 120.0,
    scadenza: "30/09/2025",
    stato: "pagata",
    dataPagamento: "10/09/2025",
    ricevutaUrl: "#",
  },
  {
    id: "q4",
    descrizione: "Quota mensile Febbraio 2026",
    importo: 45.0,
    scadenza: "28/02/2026",
    stato: "pagata",
    dataPagamento: "12/02/2026",
    ricevutaUrl: "#",
  },
];

function StatusBadge({ stato }: { stato: Quota["stato"] }) {
  const config = {
    pagata: {
      label: "Pagata",
      className: "bg-emerald-500/10 text-emerald-600",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    in_sospeso: {
      label: "In sospeso",
      className: "bg-amber-500/10 text-amber-600",
      icon: <Clock className="h-3 w-3" />,
    },
    scaduta: {
      label: "Scaduta",
      className: "bg-destructive/10 text-destructive",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[stato];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

export default function QuotePage() {
  const totaleInSospeso = quote
    .filter((q) => q.stato === "in_sospeso" || q.stato === "scaduta")
    .reduce((sum, q) => sum + q.importo, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Le mie quote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualizza lo stato dei pagamenti e scarica le ricevute
        </p>
      </div>

      {/* Summary */}
      {totaleInSospeso > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Hai pagamenti in sospeso
                </p>
                <p className="text-xs text-muted-foreground">
                  Totale da pagare: {totaleInSospeso.toFixed(2)} EUR
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <CreditCard className="h-4 w-4" />
              Paga ora
            </button>
          </div>
        </div>
      )}

      {/* Quote list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Descrizione
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Importo
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Scadenza
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Stato
                </th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quote.map((q) => (
                <tr key={q.id} className="hover:bg-accent/30">
                  <td className="px-5 py-4 font-medium text-foreground">
                    {q.descrizione}
                  </td>
                  <td className="px-5 py-4 text-foreground">
                    {q.importo.toFixed(2)} EUR
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {q.scadenza}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge stato={q.stato} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {q.stato === "in_sospeso" && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          <CreditCard className="h-3 w-3" />
                          Paga ora
                        </button>
                      )}
                      {q.ricevutaUrl && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/50"
                        >
                          <Download className="h-3 w-3" />
                          Ricevuta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
