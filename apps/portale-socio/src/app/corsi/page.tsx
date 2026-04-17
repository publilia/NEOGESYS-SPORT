"use client";

import {
  GraduationCap,
  Clock,
  MapPin,
  Users,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Corso {
  id: string;
  nome: string;
  disciplina: string;
  istruttore: string;
  orario: string;
  giorno: string;
  luogo: string;
  postiOccupati: number;
  postiTotali: number;
}

interface Presenza {
  data: string;
  corso: string;
  presente: boolean;
}

const corsiIscritti: Corso[] = [
  {
    id: "c1",
    nome: "Nuoto Avanzato",
    disciplina: "Nuoto",
    istruttore: "Luca Bianchi",
    orario: "14:00 - 15:30",
    giorno: "Lunedi, Mercoledi",
    luogo: "Piscina Comunale",
    postiOccupati: 12,
    postiTotali: 15,
  },
  {
    id: "c2",
    nome: "Pilates Base",
    disciplina: "Ginnastica",
    istruttore: "Sara Verdi",
    orario: "18:00 - 19:00",
    giorno: "Martedi, Giovedi",
    luogo: "Sala Corsi A",
    postiOccupati: 18,
    postiTotali: 20,
  },
  {
    id: "c3",
    nome: "Yoga Dolce",
    disciplina: "Yoga",
    istruttore: "Anna Neri",
    orario: "09:00 - 10:00",
    giorno: "Sabato",
    luogo: "Sala Corsi B",
    postiOccupati: 8,
    postiTotali: 12,
  },
];

const presenze: Presenza[] = [
  { data: "17/04/2026", corso: "Nuoto Avanzato", presente: true },
  { data: "16/04/2026", corso: "Pilates Base", presente: true },
  { data: "15/04/2026", corso: "Nuoto Avanzato", presente: true },
  { data: "14/04/2026", corso: "Pilates Base", presente: false },
  { data: "12/04/2026", corso: "Yoga Dolce", presente: true },
  { data: "10/04/2026", corso: "Nuoto Avanzato", presente: true },
  { data: "09/04/2026", corso: "Pilates Base", presente: true },
  { data: "08/04/2026", corso: "Nuoto Avanzato", presente: false },
];

const giorniSettimana = [
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
];

export default function CorsiPage() {
  const presenzeRate =
    presenze.length > 0
      ? Math.round(
          (presenze.filter((p) => p.presente).length / presenze.length) * 100,
        )
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">I miei corsi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Corsi a cui sei iscritto, orario settimanale e presenze
        </p>
      </div>

      {/* Enrolled courses */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Corsi iscritti</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {corsiIscritti.map((corso) => (
            <div
              key={corso.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {corso.disciplina}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{corso.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Istruttore: {corso.istruttore}
              </p>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {corso.giorno}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {corso.orario}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {corso.luogo}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  {corso.postiOccupati}/{corso.postiTotali} iscritti
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly schedule */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Orario settimanale</h2>
        <div className="mt-3 rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Giorno
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Corso
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Orario
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Luogo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {giorniSettimana.map((giorno) => {
                const corsiGiorno = corsiIscritti.filter((c) =>
                  c.giorno.includes(giorno),
                );
                if (corsiGiorno.length === 0) return null;
                return corsiGiorno.map((corso, idx) => (
                  <tr key={`${giorno}-${corso.id}`} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {idx === 0 ? giorno : ""}
                    </td>
                    <td className="px-4 py-3 text-foreground">{corso.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {corso.orario}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {corso.luogo}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance history */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Storico presenze
          </h2>
          <span className="text-sm text-muted-foreground">
            Frequenza: <span className="font-semibold text-foreground">{presenzeRate}%</span>
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {presenze.map((p, i) => (
              <div
                key={`${p.data}-${p.corso}-${i}`}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  {p.presente ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm text-foreground">{p.corso}</span>
                </div>
                <span className="text-xs text-muted-foreground">{p.data}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
