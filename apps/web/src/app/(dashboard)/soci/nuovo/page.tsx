"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  User,
  Phone,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: "anagrafica", label: "Anagrafica", icon: User },
  { id: "contatti", label: "Contatti", icon: Phone },
  { id: "sport", label: "Sport", icon: Trophy },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
] as const;

const socioSchema = z.object({
  // Anagrafica
  nome: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  cognome: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
  codiceFiscale: z
    .string()
    .length(16, "Il codice fiscale deve essere di 16 caratteri"),
  dataNascita: z.string().min(1, "La data di nascita e obbligatoria"),
  luogoNascita: z.string().min(1, "Il luogo di nascita e obbligatorio"),
  sesso: z.enum(["M", "F"]),

  // Contatti
  email: z.string().email("Inserisci un indirizzo email valido"),
  telefono: z.string().min(6, "Inserisci un numero di telefono valido"),
  indirizzo: z.string().min(1, "L'indirizzo e obbligatorio"),
  citta: z.string().min(1, "La citta e obbligatoria"),
  cap: z.string().length(5, "Il CAP deve essere di 5 cifre"),
  provincia: z.string().length(2, "Inserisci la sigla della provincia"),

  // Sport
  disciplina: z.string().min(1, "Seleziona una disciplina"),
  tipologiaTessera: z.string().min(1, "Seleziona il tipo di tessera"),
  livello: z.string().optional(),

  // Privacy
  consensoPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Il consenso privacy e obbligatorio" }),
  }),
  consensoMarketing: z.boolean().optional(),
  consensoFoto: z.boolean().optional(),
});

type SocioFormData = z.infer<typeof socioSchema>;

export default function NuovoSocioPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SocioFormData>({
    resolver: zodResolver(socioSchema),
    defaultValues: {
      sesso: "M",
      consensoPrivacy: undefined,
      consensoMarketing: false,
      consensoFoto: false,
    },
  });

  const stepFields: Record<number, (keyof SocioFormData)[]> = {
    0: ["nome", "cognome", "codiceFiscale", "dataNascita", "luogoNascita", "sesso"],
    1: ["email", "telefono", "indirizzo", "citta", "cap", "provincia"],
    2: ["disciplina", "tipologiaTessera"],
    3: ["consensoPrivacy"],
  };

  const handleNext = async () => {
    const fields = stepFields[currentStep];
    const isValid = await trigger(fields);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: SocioFormData) => {
    try {
      console.log("Nuovo socio:", data);
      // Replace with tRPC mutation
    } catch {
      // Handle error
    }
  };

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";
  const labelClass = "text-sm font-medium text-foreground";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/soci"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Nuovo Socio
          </h1>
          <p className="text-muted-foreground">
            Compila i dati per registrare un nuovo socio
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    index < currentStep ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Step 0: Anagrafica */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Dati Anagrafici
              </h2>

              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted hover:border-primary"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fileInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Anteprima foto"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <p className="text-sm text-muted-foreground">
                  Carica la foto del socio (opzionale)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="nome" className={labelClass}>Nome *</label>
                  <input id="nome" className={inputClass} {...register("nome")} />
                  {errors.nome && (
                    <p className="text-xs text-destructive">{errors.nome.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="cognome" className={labelClass}>Cognome *</label>
                  <input id="cognome" className={inputClass} {...register("cognome")} />
                  {errors.cognome && (
                    <p className="text-xs text-destructive">{errors.cognome.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="codiceFiscale" className={labelClass}>Codice Fiscale *</label>
                  <input
                    id="codiceFiscale"
                    className={`${inputClass} uppercase`}
                    maxLength={16}
                    {...register("codiceFiscale")}
                  />
                  {errors.codiceFiscale && (
                    <p className="text-xs text-destructive">{errors.codiceFiscale.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="dataNascita" className={labelClass}>Data di Nascita *</label>
                  <input id="dataNascita" type="date" className={inputClass} {...register("dataNascita")} />
                  {errors.dataNascita && (
                    <p className="text-xs text-destructive">{errors.dataNascita.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="luogoNascita" className={labelClass}>Luogo di Nascita *</label>
                  <input id="luogoNascita" className={inputClass} {...register("luogoNascita")} />
                  {errors.luogoNascita && (
                    <p className="text-xs text-destructive">{errors.luogoNascita.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="sesso" className={labelClass}>Sesso *</label>
                  <select id="sesso" className={inputClass} {...register("sesso")}>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Contatti */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Contatti</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="email" className={labelClass}>Email *</label>
                  <input id="email" type="email" className={inputClass} {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="telefono" className={labelClass}>Telefono *</label>
                  <input id="telefono" type="tel" className={inputClass} {...register("telefono")} />
                  {errors.telefono && (
                    <p className="text-xs text-destructive">{errors.telefono.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="indirizzo" className={labelClass}>Indirizzo *</label>
                  <input id="indirizzo" className={inputClass} {...register("indirizzo")} />
                  {errors.indirizzo && (
                    <p className="text-xs text-destructive">{errors.indirizzo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="citta" className={labelClass}>Citta *</label>
                  <input id="citta" className={inputClass} {...register("citta")} />
                  {errors.citta && (
                    <p className="text-xs text-destructive">{errors.citta.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="cap" className={labelClass}>CAP *</label>
                    <input id="cap" className={inputClass} maxLength={5} {...register("cap")} />
                    {errors.cap && (
                      <p className="text-xs text-destructive">{errors.cap.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="provincia" className={labelClass}>Prov. *</label>
                    <input
                      id="provincia"
                      className={`${inputClass} uppercase`}
                      maxLength={2}
                      {...register("provincia")}
                    />
                    {errors.provincia && (
                      <p className="text-xs text-destructive">{errors.provincia.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Sport */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Disciplina Sportiva
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="disciplina" className={labelClass}>Disciplina *</label>
                  <select id="disciplina" className={inputClass} {...register("disciplina")}>
                    <option value="">Seleziona...</option>
                    <option value="calcio">Calcio</option>
                    <option value="nuoto">Nuoto</option>
                    <option value="tennis">Tennis</option>
                    <option value="pallavolo">Pallavolo</option>
                    <option value="basket">Basket</option>
                    <option value="atletica">Atletica</option>
                    <option value="ginnastica">Ginnastica</option>
                    <option value="judo">Judo</option>
                    <option value="karate">Karate</option>
                  </select>
                  {errors.disciplina && (
                    <p className="text-xs text-destructive">{errors.disciplina.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="tipologiaTessera" className={labelClass}>
                    Tipologia Tessera *
                  </label>
                  <select id="tipologiaTessera" className={inputClass} {...register("tipologiaTessera")}>
                    <option value="">Seleziona...</option>
                    <option value="ordinario">Socio Ordinario</option>
                    <option value="atleta">Atleta</option>
                    <option value="istruttore">Istruttore</option>
                    <option value="dirigente">Dirigente</option>
                  </select>
                  {errors.tipologiaTessera && (
                    <p className="text-xs text-destructive">{errors.tipologiaTessera.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="livello" className={labelClass}>Livello</label>
                  <select id="livello" className={inputClass} {...register("livello")}>
                    <option value="">Nessuno</option>
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzato">Avanzato</option>
                    <option value="agonista">Agonista</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Privacy */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Consensi Privacy
              </h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    {...register("consensoPrivacy")}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Consenso al trattamento dei dati personali *
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Acconsento al trattamento dei miei dati personali ai sensi
                      del GDPR (Regolamento UE 2016/679) per le finalita
                      associative.
                    </p>
                  </div>
                </label>
                {errors.consensoPrivacy && (
                  <p className="text-xs text-destructive">
                    {errors.consensoPrivacy.message}
                  </p>
                )}

                <label className="flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    {...register("consensoMarketing")}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Comunicazioni promozionali
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Acconsento a ricevere comunicazioni su eventi, promozioni e
                      novita.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    {...register("consensoFoto")}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Utilizzo immagini
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Acconsento all&apos;utilizzo delle mie immagini per finalita
                      promozionali dell&apos;associazione.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Avanti
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salva Socio
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
