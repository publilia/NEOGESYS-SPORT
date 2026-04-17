"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Edit,
  Pause,
  Printer,
  User,
  FileCheck,
  Receipt,
  BookOpen,
  FileText,
  Clock,
  TrendingDown,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

type TabSocio = "anagrafica" | "certificati" | "quote" | "corsi" | "documenti" | "storico";
type StatoSocio = "attivo" | "scaduto" | "sospeso" | "in_attesa";
type StatoCertificato = "valido" | "scaduto" | "mancante";

const TAB_CONFIG: Record<TabSocio, { label: string; icon: typeof User }> = {
  anagrafica: { label: "Anagrafica", icon: User },
  certificati: { label: "Certificati", icon: FileCheck },
  quote: { label: "Quote", icon: Receipt },
  corsi: { label: "Corsi", icon: BookOpen },
  documenti: { label: "Documenti", icon: FileText },
  storico: { label: "Storico", icon: Clock },
};

const STATI_COLORS: Record<StatoSocio, string> = {
  attivo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  scaduto: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  sospeso: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_attesa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATI_LABELS: Record<StatoSocio, string> = {
  attivo: "Attivo",
  scaduto: "Scaduto",
  sospeso: "Sospeso",
  in_attesa: "In attesa",
};

// Sample data - replace with tRPC query
const SAMPLE_SOCIO = {
  id: "1",
  tessera: "SOC-001",
  nome: "Mario",
  cognome: "Rossi",
  stato: "attivo" as StatoSocio,
  dataNascita: "1990-05-15",
  luogoNascita: "Roma",
  codiceFiscale: "RSSMRA90E15H501Z",
  email: "mario.rossi@email.it",
  telefono: "+39 333 1234567",
  indirizzo: "Via Roma 42, 00100 Roma (RM)",
  disciplina: "Calcio",
  dataIscrizione: "2024-09-01",
  churnScore: 15,
};

const SAMPLE_CERTIFICATI = [
  { id: "1", tipo: "Certificato medico agonistico", stato: "valido" as StatoCertificato, dataEmissione: "2026-01-10", dataScadenza: "2027-01-10", medico: "Dott. Bianchi" },
  { id: "2", tipo: "Certificato medico non agonistico", stato: "scaduto" as StatoCertificato, dataEmissione: "2024-06-15", dataScadenza: "2025-06-15", medico: "Dott. Verdi" },
];

const SAMPLE_QUOTE = [
  { id: "1", descrizione: "Quota associativa 2026", importo: 120, stato: "pagata", dataPagamento: "2026-01-05", metodo: "Stripe" },
  { id: "2", descrizione: "Iscrizione Calcio Under 12", importo: 80, stato: "pagata", dataPagamento: "2025-09-10", metodo: "Contanti" },
  { id: "3", descrizione: "Quota associativa 2025", importo: 100, stato: "pagata", dataPagamento: "2025-01-08", metodo: "Bonifico" },
];

const SAMPLE_CORSI = [
  { id: "1", nome: "Calcio Under 12", istruttore: "Marco Bianchi", giorno: "Lunedi e Mercoledi", orario: "16:00 - 17:30", stato: "attivo" },
  { id: "2", nome: "Calcetto Estivo", istruttore: "Marco Bianchi", giorno: "Sabato", orario: "10:00 - 12:00", stato: "concluso" },
];

const SAMPLE_DOCUMENTI = [
  { id: "1", nome: "Certificato medico 2026.pdf", tipo: "certificato", data: "2026-01-10", dimensione: "245 KB" },
  { id: "2", nome: "Modulo iscrizione.pdf", tipo: "modulo", data: "2024-09-01", dimensione: "380 KB" },
  { id: "3", nome: "Liberatoria immagini.pdf", tipo: "liberatoria", data: "2024-09-01", dimensione: "150 KB" },
];

const SAMPLE_STORICO = [
  { id: "1", data: "2026-04-15", azione: "Login effettuato", dettagli: "Accesso da dispositivo mobile" },
  { id: "2", data: "2026-01-10", azione: "Certificato caricato", dettagli: "Certificato medico agonistico" },
  { id: "3", data: "2026-01-05", azione: "Pagamento ricevuto", dettagli: "Quota associativa 2026 - 120,00 EUR" },
  { id: "4", data: "2025-09-10", azione: "Iscritto a corso", dettagli: "Calcio Under 12" },
  { id: "5", data: "2024-09-01", azione: "Socio creato", dettagli: "Prima iscrizione all'associazione" },
];

const CERT_STATUS_ICONS: Record<StatoCertificato, typeof CheckCircle2> = {
  valido: CheckCircle2,
  scaduto: XCircle,
  mancante: AlertTriangle,
};

const CERT_STATUS_COLORS: Record<StatoCertificato, string> = {
  valido: "text-green-600 dark:text-green-400",
  scaduto: "text-red-600 dark:text-red-400",
  mancante: "text-yellow-600 dark:text-yellow-400",
};

export default function SocioDetailPage() {
  const [activeTab, setActiveTab] = useState<TabSocio>("anagrafica");
  const socio = SAMPLE_SOCIO;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/soci"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {socio.nome} {socio.cognome}
                </h1>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATI_COLORS[socio.stato]}`}
                >
                  {STATI_LABELS[socio.stato]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">{socio.tessera}</span>
                <span>&middot;</span>
                <span>{socio.disciplina}</span>
                <span>&middot;</span>
                <span>Iscritto dal {new Date(socio.dataIscrizione).toLocaleDateString("it-IT")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Edit className="h-4 w-4" />
              Modifica
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-muted dark:text-yellow-400"
            >
              <Pause className="h-4 w-4" />
              Sospendi
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Printer className="h-4 w-4" />
              Stampa Tessera
            </button>
          </div>
        </div>
      </div>

      {/* Churn score */}
      {socio.churnScore !== undefined && (
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${
          socio.churnScore > 50
            ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10"
            : socio.churnScore > 25
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10"
              : "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10"
        }`}>
          <TrendingDown className={`h-5 w-5 ${
            socio.churnScore > 50
              ? "text-red-600 dark:text-red-400"
              : socio.churnScore > 25
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-green-600 dark:text-green-400"
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              Rischio abbandono: {socio.churnScore}%
            </p>
            <p className="text-xs text-muted-foreground">
              {socio.churnScore > 50
                ? "Rischio elevato - Consigliato contatto diretto"
                : socio.churnScore > 25
                  ? "Rischio moderato - Monitorare la situazione"
                  : "Rischio basso - Socio fidelizzato"}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
        {(Object.keys(TAB_CONFIG) as TabSocio[]).map((tab) => {
          const config = TAB_CONFIG[tab];
          const Icon = config.icon;
          return (
            <button
              key={tab}
              type="button"
              className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Anagrafica Tab */}
      {activeTab === "anagrafica" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Dati Anagrafici</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</p>
              <p className="mt-1 text-sm text-foreground">{socio.nome}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cognome</p>
              <p className="mt-1 text-sm text-foreground">{socio.cognome}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data di Nascita</p>
              <p className="mt-1 text-sm text-foreground">{new Date(socio.dataNascita).toLocaleDateString("it-IT")}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Luogo di Nascita</p>
              <p className="mt-1 text-sm text-foreground">{socio.luogoNascita}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Codice Fiscale</p>
              <p className="mt-1 font-mono text-sm text-foreground">{socio.codiceFiscale}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tessera</p>
              <p className="mt-1 font-mono text-sm text-foreground">{socio.tessera}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="mt-1 text-sm text-foreground">{socio.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Telefono</p>
              <p className="mt-1 text-sm text-foreground">{socio.telefono}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Indirizzo</p>
              <p className="mt-1 text-sm text-foreground">{socio.indirizzo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Certificati Tab */}
      {activeTab === "certificati" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Emissione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Scadenza</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Medico</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_CERTIFICATI.map((cert) => {
                  const StatusIcon = CERT_STATUS_ICONS[cert.stato];
                  return (
                    <tr key={cert.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{cert.tipo}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 ${CERT_STATUS_COLORS[cert.stato]}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="capitalize">{cert.stato}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(cert.dataEmissione).toLocaleDateString("it-IT")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(cert.dataScadenza).toLocaleDateString("it-IT")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{cert.medico}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quote Tab */}
      {activeTab === "quote" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrizione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Importo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Pagamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Metodo</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_QUOTE.map((quota) => (
                  <tr key={quota.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{quota.descrizione}</td>
                    <td className="px-4 py-3 text-sm font-mono">{quota.importo.toFixed(2)} &euro;</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 capitalize dark:bg-green-900/30 dark:text-green-400">
                        {quota.stato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(quota.dataPagamento).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{quota.metodo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Corsi Tab */}
      {activeTab === "corsi" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {SAMPLE_CORSI.map((corso) => (
            <div key={corso.id} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{corso.nome}</h3>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  corso.stato === "attivo"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                }`}>
                  {corso.stato}
                </span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{corso.istruttore}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{corso.giorno} &middot; {corso.orario}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documenti Tab */}
      {activeTab === "documenti" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Dimensione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_DOCUMENTI.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{doc.nome}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 capitalize dark:bg-gray-900/30 dark:text-gray-400">
                        {doc.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(doc.data).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.dimensione}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                        title="Scarica"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storico Tab */}
      {activeTab === "storico" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {SAMPLE_STORICO.map((evento) => (
              <div key={evento.id} className="flex items-start gap-4 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{evento.azione}</p>
                  <p className="text-xs text-muted-foreground">{evento.dettagli}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(evento.data).toLocaleDateString("it-IT")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
