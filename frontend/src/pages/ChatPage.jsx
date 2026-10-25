import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle, BookOpen, Check, ChevronDown, Copy, MessageSquare,
  RefreshCw, RotateCcw, Send, ThumbsDown, ThumbsUp, X,
} from 'lucide-react';
import { checkHealth, sendChatMessage } from '../services/api';

const MAX_CHARS = 1000;

export default function ChatPage({ latestPrediction }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [copied, setCopied] = useState(null);
  const [reactions, setReactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('equirisk_chat_reactions') || '{}'); } catch { return {}; }
  });
  const endRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const lastQueryRef = useRef('');
  const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll('button:not([disabled]), textarea:not([disabled]), a[href], summary');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    const check = async () => {
      const status = await checkHealth();
      if (mounted) setOnline(status?.status !== 'offline');
    };
    check();
    const timer = window.setInterval(check, 60000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [open]);

  const send = async (query, retry = false) => {
    const text = query.trim();
    if (!text || loading) return;
    lastQueryRef.current = text;
    const priorMessages = messages.filter((message) => !message.isError);
    if (retry && priorMessages.at(-1)?.role === 'user' && priorMessages.at(-1)?.content === text) priorMessages.pop();
    const history = priorMessages.map(({ role, content }) => ({ role, content }));
    if (retry) setMessages((current) => current.filter((message, index) => !(index === current.length - 1 && message.isError)));
    else setMessages((current) => [...current, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setOnline(true);
    try {
      const data = await sendChatMessage(text, history, 4, 0.38);
      setMessages((current) => [...current, {
        role: 'assistant', content: data.answer, sources: data.sources || [],
        category: data.category || 'health_education', provider: data.provider || data.llm_provider || null,
        model: data.model || null, debugTrace: data.debug_trace || null,
      }]);
    } catch (error) {
      setOnline(false);
      setMessages((current) => [...current, {
        role: 'assistant', isError: true,
        content: error.message || 'The Health Assistant could not connect. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessages([]);
    lastQueryRef.current = '';
    setInput('');
    setReactions({});
    try { localStorage.removeItem('equirisk_chat_reactions'); } catch { /* Clear remains usable when storage is unavailable. */ }
  };
  const react = (index, value) => {
    const next = { ...reactions, [index]: value };
    setReactions(next);
    try { localStorage.setItem('equirisk_chat_reactions', JSON.stringify(next)); } catch { /* Reactions remain in component state if storage is unavailable. */ }
  };
  const copy = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1200);
    } catch { /* Clipboard access may be unavailable in some browsers. */ }
  };

  const suggestions = latestPrediction
    ? ['What can I change to lower my risk?', 'What does my result mean?', 'How can I prevent diabetes?', 'What is HbA1c?']
    : ['How can I prevent diabetes?', 'Can prediabetes be reversed?', 'What is HbA1c?', 'What does a high risk result mean?'];

  return <>
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open Health Assistant"
      className="fixed bottom-5 right-5 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-xl transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <MessageSquare size={18} /> Health Assistant
    </button>

    {open && <div
      className="fixed inset-0 z-[80] bg-black/55"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="assistant-title" className="absolute inset-0 ml-auto flex h-full w-full flex-col overflow-hidden bg-surface shadow-2xl md:inset-y-3 md:right-3 md:h-[calc(100%-1.5rem)] md:max-w-[460px] md:rounded-2xl md:border md:border-outline-variant/40">
        <header className="flex items-center justify-between gap-3 border-b border-outline-variant/30 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary-container/20 p-2 text-primary"><MessageSquare size={20} /></div>
            <div className="min-w-0">
              <h2 id="assistant-title" className="truncate text-lg font-bold text-on-surface">Health Assistant</h2>
              <p className="text-xs text-on-surface-variant">Questions about diabetes and your EquiRisk result</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={clear} disabled={messages.length === 0} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-on-surface-variant hover:bg-surface-variant disabled:cursor-default disabled:opacity-50"><RefreshCw size={15} /> Clear</button>
            <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Close Health Assistant" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-variant"><X size={20} /></button>
          </div>
        </header>

        {!online && <div role="status" className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">The service is offline. Check your connection and retry.</div>}

        <div className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions text">
          <div className="mx-auto max-w-[42rem] space-y-4">
            {messages.length === 0 && <div className="px-1 py-8 text-center sm:py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary-container/20 text-primary"><BookOpen size={28} /></div>
              <h3 className="mb-2 text-lg font-bold text-on-surface">How can I help?</h3>
              <p className="mx-auto mb-5 max-w-sm text-sm leading-6 text-on-surface-variant">Ask about prevention, HbA1c, or how to understand an EquiRisk result.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((question) => <button key={question} type="button" onClick={() => send(question)} className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 text-left text-xs leading-5 text-on-surface transition-colors hover:bg-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{question}</button>)}
              </div>
            </div>}

            {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <article className={`min-w-0 max-w-[94%] rounded-2xl p-3.5 sm:max-w-[88%] ${message.role === 'user' ? 'rounded-br-sm bg-primary-container text-on-primary-container' : 'rounded-bl-sm border border-outline-variant/30 bg-surface-container text-on-surface'}`}>
                {message.isError ? <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-error"><AlertTriangle size={17} /><span className="text-sm font-semibold">Could not send that</span></div>
                  <p className="text-sm leading-5 text-on-surface-variant">{message.content}</p>
                  <button type="button" onClick={() => send(lastQueryRef.current, true)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"><RotateCcw size={13} /> Retry</button>
                </div> : message.category === 'emergency' || message.category === 'unsafe' ? <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-6"><AlertTriangle size={17} className="mt-1 shrink-0 text-amber-200" /><p>{message.content}</p></div> : message.category === 'out_of_scope' ? <p className="text-sm leading-6">{message.content}</p> : <>
                  {message.provider === 'extractive_fallback' && <span className="mb-2 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100">Limited mode</span>}
                  <div className="break-words text-sm leading-6 [&_a]:text-primary [&_a]:underline [&_li]:pl-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                    <ReactMarkdown components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{message.content}</ReactMarkdown>
                  </div>
                </>}

                {message.sources?.length > 0 && <details className="group mt-3 border-t border-outline-variant/20 pt-2.5">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-on-surface-variant"><ChevronDown size={14} className="transition-transform group-open:rotate-180" /> Sources ({message.sources.length})</summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.map((source, sourceIndex) => {
                      const url = source.source_url || source.url;
                      const label = [source.title || 'Clinical reference', source.section, source.organisation].filter(Boolean).join(' · ');
                      const chip = <span className="block max-w-[19rem] truncate rounded-lg border border-outline-variant/30 bg-surface-variant/60 px-2.5 py-1.5 text-xs text-on-surface" title={label}>{label}</span>;
                      return url?.startsWith('https://') || url?.startsWith('http://') ? <a key={sourceIndex} href={url} target="_blank" rel="noopener noreferrer" className="max-w-full">{chip}</a> : <span key={sourceIndex}>{chip}</span>;
                    })}
                  </div>
                </details>}

                {message.role === 'assistant' && !message.isError && <div className="mt-3 flex items-center gap-1 border-t border-outline-variant/20 pt-2">
                  <button type="button" onClick={() => copy(message.content, index)} aria-label="Copy answer" className="rounded p-1.5 text-on-surface-variant hover:bg-surface-variant">{copied === index ? <Check size={14} /> : <Copy size={14} />}</button>
                  <button type="button" onClick={() => react(index, 'up')} aria-label="Helpful" aria-pressed={reactions[index] === 'up'} className={`rounded p-1.5 hover:bg-surface-variant ${reactions[index] === 'up' ? 'text-primary' : 'text-on-surface-variant'}`}><ThumbsUp size={14} /></button>
                  <button type="button" onClick={() => react(index, 'down')} aria-label="Not helpful" aria-pressed={reactions[index] === 'down'} className={`rounded p-1.5 hover:bg-surface-variant ${reactions[index] === 'down' ? 'text-primary' : 'text-on-surface-variant'}`}><ThumbsDown size={14} /></button>
                </div>}
                {debugMode && message.debugTrace && <details className="mt-2 rounded-lg border border-outline-variant/30 p-2 text-xs"><summary className="cursor-pointer text-on-surface-variant">Developer trace</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[10px] text-on-surface-variant">{JSON.stringify(message.debugTrace, null, 2)}</pre></details>}
              </article>
            </div>)}

            {loading && <div role="status" className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface-variant"><span className="flex gap-1" aria-hidden="true"><i className="h-2 w-2 animate-bounce rounded-full bg-primary" /><i className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" /><i className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" /></span>Thinking…</div></div>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-outline-variant/30 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="mx-auto flex max-w-[42rem] items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              maxLength={MAX_CHARS}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(input); } }}
              placeholder="Ask a health question…"
              aria-label="Your message"
              disabled={loading}
              className="min-h-12 flex-1 resize-none rounded-xl border border-outline-variant/40 bg-surface-variant px-3.5 py-3 text-sm leading-5 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || loading} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 font-semibold text-on-primary shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"><Send size={17} /><span className="hidden sm:inline">Send</span></button>
          </form>
          <p className="mx-auto mt-2 flex max-w-[42rem] justify-between text-[11px] text-on-surface-variant"><span>General health information, not medical advice.</span><span>{input.length}/{MAX_CHARS}</span></p>
        </div>
      </section>
    </div>}
  </>;
}
