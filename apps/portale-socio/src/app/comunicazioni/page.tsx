"use client";

import { useState } from "react";
import {
  Mail,
  MailOpen,
  Megaphone,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface Messaggio {
  id: string;
  oggetto: string;
  mittente: string;
  anteprima: string;
  contenuto: string;
  data: string;
  letto: boolean;
  tipo: "personale" | "bacheca";
}

const messaggi: Messaggio[] = [
  {
    id: "m1",
    oggetto: "Cambio orario lezione Nuoto",
    mittente: "Segreteria ASD",
    anteprima:
      "Si informa che a partire dalla prossima settimana la lezione di Nuoto Avanzato...",
    contenuto:
      "Si informa che a partire dalla prossima settimana la lezione di Nuoto Avanzato del lunedi si spostera alle ore 15:00 anziche 14:00. L'orario del mercoledi resta invariato. Per qualsiasi informazione, contattare la segreteria.",
    data: "17/04/2026",
    letto: false,
    tipo: "personale",
  },
  {
    id: "m2",
    oggetto: "Scadenza quota mensile Aprile",
    mittente: "Sistema automatico",
    anteprima:
      "Ti ricordiamo che la quota mensile di Aprile e in scadenza il 30/04...",
    contenuto:
      "Ti ricordiamo che la quota mensile di Aprile 2026 (EUR 45,00) e in scadenza il 30/04/2026. Puoi effettuare il pagamento direttamente dal portale nella sezione Quote.",
    data: "15/04/2026",
    letto: false,
    tipo: "personale",
  },
  {
    id: "m3",
    oggetto: "Torneo Interclubs - Iscrizioni aperte",
    mittente: "Direzione Sportiva",
    anteprima:
      "Sono aperte le iscrizioni per il Torneo Interclubs che si terra il 15 maggio...",
    contenuto:
      "Sono aperte le iscrizioni per il Torneo Interclubs che si terra il 15 maggio 2026 presso il Centro Sportivo Comunale. Le iscrizioni si chiuderanno il 5 maggio. Per iscriversi, contattare il proprio istruttore di riferimento.",
    data: "10/04/2026",
    letto: true,
    tipo: "bacheca",
  },
  {
    id: "m4",
    oggetto: "Chiusura estiva impianti",
    mittente: "Segreteria ASD",
    anteprima:
      "Si comunica che gli impianti sportivi resteranno chiusi dal 1 al 31 agosto...",
    contenuto:
      "Si comunica che gli impianti sportivi resteranno chiusi dal 1 al 31 agosto 2026 per manutenzione straordinaria. Le attivita riprenderanno regolarmente dal 1 settembre 2026.",
    data: "05/04/2026",
    letto: true,
    tipo: "bacheca",
  },
];

export default function ComunicazioniPage() {
  const [selectedMessage, setSelectedMessage] = useState<Messaggio | null>(null);
  const [filtro, setFiltro] = useState<"tutti" | "personale" | "bacheca">("tutti");

  const messaggiFiltrati =
    filtro === "tutti"
      ? messaggi
      : messaggi.filter((m) => m.tipo === filtro);

  const nonLetti = messaggi.filter((m) => !m.letto).length;

  if (selectedMessage) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedMessage(null)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla lista
        </button>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {selectedMessage.oggetto}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Da: {selectedMessage.mittente}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {selectedMessage.data}
            </div>
          </div>
          <div className="mt-6 text-sm leading-relaxed text-foreground">
            {selectedMessage.contenuto}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comunicazioni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messaggi personali e avvisi dalla bacheca dell'associazione
          {nonLetti > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {nonLetti} non letti
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(
          [
            { key: "tutti", label: "Tutti", icon: <Mail className="h-3.5 w-3.5" /> },
            {
              key: "personale",
              label: "Personali",
              icon: <MailOpen className="h-3.5 w-3.5" />,
            },
            {
              key: "bacheca",
              label: "Bacheca",
              icon: <Megaphone className="h-3.5 w-3.5" />,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filtro === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {messaggiFiltrati.map((msg) => (
            <button
              key={msg.id}
              type="button"
              onClick={() => setSelectedMessage(msg)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/30"
            >
              <div className="shrink-0">
                {msg.tipo === "bacheca" ? (
                  <Megaphone
                    className={`h-5 w-5 ${msg.letto ? "text-muted-foreground" : "text-primary"}`}
                  />
                ) : msg.letto ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm truncate ${
                      msg.letto
                        ? "text-foreground"
                        : "font-semibold text-foreground"
                    }`}
                  >
                    {msg.oggetto}
                  </p>
                  {!msg.letto && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {msg.mittente} - {msg.anteprima}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{msg.data}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {messaggiFiltrati.length === 0 && (
            <div className="px-5 py-10 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nessuna comunicazione trovata
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
