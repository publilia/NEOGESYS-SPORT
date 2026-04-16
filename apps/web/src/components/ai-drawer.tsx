"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Check,
  XCircle,
} from "lucide-react";
import { useUIStore } from "@/lib/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCall?: {
    name: string;
    description: string;
    status: "pending" | "confirmed" | "cancelled";
  };
}

const INITIAL_SUGGESTIONS = [
  "Quanti soci attivi abbiamo?",
  "Mostra i certificati in scadenza",
  "Crea un report delle quote non pagate",
  "Invia un promemoria ai soci",
];

export function AIDrawer() {
  const { aiDrawerOpen, setAiDrawerOpen } = useUIStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ciao! Sono il tuo assistente AI per la gestione sportiva. Come posso aiutarti?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setAiDrawerOpen(!aiDrawerOpen);
      }
    },
    [aiDrawerOpen, setAiDrawerOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text?: string) => {
    const content = text ?? input;
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    // Simulated AI response
    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: getSimulatedResponse(content),
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setInput("");
  };

  const handleToolAction = (messageId: string, action: "confirmed" | "cancelled") => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.toolCall
          ? { ...m, toolCall: { ...m.toolCall, status: action } }
          : m,
      ),
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {aiDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={() => setAiDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-border bg-background shadow-xl"
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    AI Assistant
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Assistente gestionale
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Chiudi AI Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={`flex gap-3 ${
                        message.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          message.role === "assistant"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>

                    {/* Tool call card */}
                    {message.toolCall && (
                      <div className="ml-10 mt-2 rounded-lg border border-border bg-card p-3">
                        <p className="text-xs font-medium text-foreground">
                          {message.toolCall.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {message.toolCall.description}
                        </p>
                        {message.toolCall.status === "pending" && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToolAction(message.id, "confirmed")
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                            >
                              <Check className="h-3 w-3" />
                              Conferma
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleToolAction(message.id, "cancelled")
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground"
                            >
                              <XCircle className="h-3 w-3" />
                              Annulla
                            </button>
                          </div>
                        )}
                        {message.toolCall.status === "confirmed" && (
                          <p className="mt-2 text-xs text-green-600">
                            Azione confermata
                          </p>
                        )}
                        {message.toolCall.status === "cancelled" && (
                          <p className="mt-2 text-xs text-destructive">
                            Azione annullata
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Suggerimenti
                  </p>
                  {INITIAL_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      className="block w-full rounded-lg border border-border p-2.5 text-left text-xs text-foreground hover:bg-muted"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Scrivi un messaggio..."
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                ⌘J per aprire/chiudere
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("soci attivi") || lower.includes("quanti soci")) {
    return "Al momento ci sono 142 soci attivi nella tua associazione. 12 soci hanno la tessera in scadenza entro i prossimi 30 giorni.";
  }
  if (lower.includes("certificat")) {
    return "Ci sono 8 certificati medici in scadenza entro i prossimi 30 giorni. Vuoi che invii un promemoria automatico ai soci interessati?";
  }
  if (lower.includes("report") || lower.includes("quote")) {
    return "Ho trovato 15 quote non pagate per un totale di 3.750 EUR. Posso generare un report dettagliato in PDF o inviare un sollecito via email.";
  }
  if (lower.includes("promemoria") || lower.includes("invia")) {
    return "Preparero l'invio dei promemoria. Vuoi che utilizzi email, WhatsApp o entrambi?";
  }
  return "Ho capito la tua richiesta. Sto analizzando i dati. Come posso aiutarti ulteriormente?";
}
