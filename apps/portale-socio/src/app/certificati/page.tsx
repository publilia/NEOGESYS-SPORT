"use client";

import { useState } from "react";
import {
  FileCheck,
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  History,
} from "lucide-react";

interface Certificato {
  id: string;
  tipo: string;
  dataRilascio: string;
  dataScadenza: string;
  stato: "valido" | "in_scadenza" | "scaduto";
  medicoRilasciante: string;
  fileUrl?: string;
}

const certificati: Certificato[] = [
  {
    id: "cert1",
    tipo: "Certificato Agonistico",
    dataRilascio: "15/05/2025",
    dataScadenza: "15/05/2026",
    stato: "in_scadenza",
    medicoRilasciante: "Dott. Giuseppe Verdi",
    fileUrl: "#",
  },
  {
    id: "cert2",
    tipo: "Certificato Non Agonistico",
    dataRilascio: "10/01/2025",
    dataScadenza: "10/01/2026",
    stato: "scaduto",
    medicoRilasciante: "Dott.ssa Maria Bianchi",
    fileUrl: "#",
  },
];

const storico: Array<{ data: string; azione: string; dettaglio: string }> = [
  {
    data: "15/05/2025",
    azione: "Caricamento",
    dettaglio: "Certificato Agonistico caricato",
  },
  {
    data: "10/01/2025",
    azione: "Caricamento",
    dettaglio: "Certificato Non Agonistico caricato",
  },
  {
    data: "10/01/2024",
    azione: "Scadenza",
    dettaglio: "Certificato Non Agonistico precedente scaduto",
  },
];

function calcolaGiorniRimanenti(dataScadenza: string): number {
  const [giorno, mese, anno] = dataScadenza.split("/").map(Number);
  const scadenza = new Date(anno, mese - 1, giorno);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  return Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
}

function StatoBadge({ stato }: { stato: Certificato["stato"] }) {
  const config = {
    valido: {
      label: "Valido",
      className: "bg-emerald-500/10 text-emerald-600",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    in_scadenza: {
      label: "In scadenza",
      className: "bg-amber-500/10 text-amber-600",
      icon: <Clock className="h-3 w-3" />,
    },
    scaduto: {
      label: "Scaduto",
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

export default function CertificatiPage() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Certificati medici</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stato dei tuoi certificati, scadenze e caricamento nuovi documenti
        </p>
      </div>

      {/* Current certificates */}
      <div className="grid gap-4 sm:grid-cols-2">
        {certificati.map((cert) => {
          const giorniRimanenti = calcolaGiorniRimanenti(cert.dataScadenza);
          return (
            <div
              key={cert.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileCheck className="h-5 w-5" />
                </div>
                <StatoBadge stato={cert.stato} />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{cert.tipo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {cert.medicoRilasciante}
              </p>

              {/* Expiry countdown */}
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scadenza:</span>
                  <span className="font-medium text-foreground">
                    {cert.dataScadenza}
                  </span>
                </div>
                {cert.stato !== "scaduto" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mancano{" "}
                    <span
                      className={`font-semibold ${
                        giorniRimanenti <= 30
                          ? "text-amber-600"
                          : "text-foreground"
                      }`}
                    >
                      {giorniRimanenti} giorni
                    </span>{" "}
                    alla scadenza
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    Scaduto da {Math.abs(giorniRimanenti)} giorni - rinnovo
                    necessario
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rilasciato il {cert.dataRilascio}</span>
                {cert.fileUrl && (
                  <button
                    type="button"
                    className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/50"
                  >
                    <Download className="h-3 w-3" />
                    Scarica
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload new certificate */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Carica nuovo certificato
        </h2>
        <div
          className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            // TODO: Handle file upload
          }}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Trascina il file qui oppure
          </p>
          <button
            type="button"
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Seleziona file
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            PDF, JPG o PNG, massimo 10 MB
          </p>
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Storico</h2>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {storico.map((item, i) => (
              <div
                key={`${item.data}-${i}`}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm text-foreground">{item.dettaglio}</p>
                  <p className="text-xs text-muted-foreground">{item.azione}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {item.data}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
