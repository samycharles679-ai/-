import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  Delete,
  Loader2,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Search,
  X,
  Users,
  Radio,
} from 'lucide-react';
import { COUNTRIES, CountryOption } from './data/countries';

interface ConnectedSessionInfo {
  sessionKey: string;
  phone: string;
  userName?: string;
  botMode: 'public' | 'private';
  autoStatusView: boolean;
  autoStatusReactEmoji?: string | null;
  alwaysOnline: boolean;
  connectedAt?: number;
  commandsCount?: number;
  sessionId?: string | null;
}

export default function App() {
  // Default country: Côte d'Ivoire (+225) or user can pick any country / free input
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[1]);
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [rawPairingCode, setRawPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSessionId, setCopiedSessionId] = useState<boolean>(false);
  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);

  // Session tracking with backend
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    'idle' | 'code_ready' | 'connected' | 'expired'
  >('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [connectedSessions, setConnectedSessions] = useState<ConnectedSessionInfo[]>([]);

  // Modals / Drawers inside the phone screen
  const [isCountryOpen, setIsCountryOpen] = useState<boolean>(false);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [isSessionsOpen, setIsSessionsOpen] = useState<boolean>(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer when pairing code is active
  useEffect(() => {
    if (countdown <= 0 || sessionStatus !== 'code_ready') return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setSessionStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, sessionStatus]);

  const fetchSessionsStatus = useCallback(async () => {
    try {
      if (sessionKey) {
        const res = await fetch(`/api/session/${sessionKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'connected') {
            setSessionStatus('connected');
            if (data.sessionId) setSessionId(data.sessionId);
          } else if (data.status === 'expired') {
            setSessionStatus('expired');
          }
        }
      }

      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const list: ConnectedSessionInfo[] = Array.isArray(statusData.connectedSessions)
          ? statusData.connectedSessions
          : [];
        setConnectedSessions(list);
        if (list.length > 0) {
          const active = list[0];
          setSessionStatus('connected');
          if (!sessionKey && active.sessionKey) {
            setSessionKey(active.sessionKey);
          }
          if (!sessionId && active.sessionId) {
            setSessionId(active.sessionId);
          }
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [sessionKey, sessionId]);

  // Poll backend for live WhatsApp connection status (both current pairing & persistent restored sessions)
  useEffect(() => {
    fetchSessionsStatus();
    const poll = setInterval(fetchSessionsStatus, 3000);
    return () => clearInterval(poll);
  }, [fetchSessionsStatus]);

  // Compute full international number (digits only)
  const getFullPhoneDigits = useCallback(() => {
    const cleanLocal = phoneDigits.replace(/[^0-9]/g, '');
    if (!selectedCountry.dialCode) {
      return cleanLocal;
    }
    if (
      cleanLocal.startsWith(selectedCountry.dialCode) &&
      cleanLocal.length >= selectedCountry.dialCode.length + 7
    ) {
      return cleanLocal;
    }
    let normalizedLocal = cleanLocal;
    const keepZeroCountries = ['225', '229'];
    if (
      !keepZeroCountries.includes(selectedCountry.dialCode) &&
      normalizedLocal.startsWith('0') &&
      normalizedLocal.length > 8
    ) {
      normalizedLocal = normalizedLocal.slice(1);
    }
    return `${selectedCountry.dialCode}${normalizedLocal}`;
  }, [phoneDigits, selectedCountry]);

  // Format phone digits nicely for display in the top field
  const formatDisplayPhone = (digits: string) => {
    if (!digits) return '';
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  // Handle keypad digit press
  const handleKeyPress = useCallback((digit: string) => {
    setErrorMsg(null);
    setPhoneDigits((prev) => {
      if (prev.length >= 15) return prev;
      return prev + digit;
    });
  }, []);

  // Handle keypad backspace
  const handleBackspace = useCallback(() => {
    setErrorMsg(null);
    setPhoneDigits((prev) => prev.slice(0, -1));
  }, []);

  // Handle full clear / reset
  const handleClear = useCallback(() => {
    setPhoneDigits('');
    setPairingCode('');
    setRawPairingCode('');
    setErrorMsg(null);
    setSessionStatus('idle');
    setSessionKey(null);
    setSessionId(null);
    setCountdown(0);
  }, []);

  // Copy helper that works inside iframes and modern browsers
  const copyToClipboard = async (
    textToCopy: string,
    type: 'code' | 'session' | 'item',
    itemKey?: string
  ) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } else if (type === 'session') {
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2200);
    } else if (type === 'item' && itemKey) {
      setCopiedItemKey(itemKey);
      setTimeout(() => setCopiedItemKey(null), 2200);
    }
  };

  // Request Pairing Code from backend
  const handleGeneratePairingCode = async () => {
    const fullNumber = getFullPhoneDigits();
    if (fullNumber.length < 8 || fullNumber.length > 15) {
      setErrorMsg('Entrez un numéro WhatsApp valide (8 à 15 chiffres).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setCopiedCode(false);

    try {
      const response = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Impossible de générer le code.');
      }

      setPairingCode(data.code);
      setRawPairingCode(data.rawCode || data.code.replace(/[^A-Z0-9]/gi, ''));
      setSessionKey(data.sessionKey);
      setSessionStatus('code_ready');
      setCountdown(data.expiresInSeconds || 120);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Support physical keyboard typing for convenience
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCountryOpen || isSessionsOpen) return;
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && phoneDigits.length >= 6) {
          handleGeneratePairingCode();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch.replace('+', '')) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none fluted-backdrop flex items-center justify-center p-0 sm:p-3 select-none">
      {/* Center Fixed Phone Device — Battery & Clock bar removed, screen frozen */}
      <main
        aria-label="Interface de connexion WhatsApp ᴀʟʟɪssᴀ ᴍᴅ"
        className="relative w-full max-w-[400px] h-[100dvh] sm:h-auto sm:max-h-[96dvh] sm:rounded-[40px] bg-[#121311] sm:border-[6px] sm:border-[#242622] sm:shadow-[0_32px_90px_rgba(0,0,0,0.88),0_0_70px_rgba(163,255,18,0.08)] sm:ring-1 sm:ring-white/10 flex flex-col justify-between overflow-hidden px-4 pt-2.5 pb-3 sm:px-5 sm:pt-3.5 sm:pb-4"
      >
        {/* App Bar Header (<   ᴀʟʟɪssᴀ ᴍᴅ   [Session Logo]) */}
        <header className="flex items-center justify-between py-1 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            title="Réinitialiser la saisie"
            className="w-9 h-9 rounded-full bg-[#1C1E1B] hover:bg-[#252824] active:scale-95 border border-white/[0.06] flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectedSessions.length > 0
                  ? 'bg-[#A3FF12] shadow-[0_0_8px_#A3FF12]'
                  : 'bg-white/30'
              }`}
            />
            <h1 className="text-[15.5px] font-semibold tracking-wide text-white">
              ᴀʟʟɪssᴀ ᴍᴅ
            </h1>
          </div>

          {/* Session Logo Button (Replaces ••• button, opens Connected Sessions list) */}
          <button
            type="button"
            onClick={() => {
              fetchSessionsStatus();
              setIsSessionsOpen(true);
            }}
            title="Voir les sessions connectées"
            className="relative h-9 px-2.5 rounded-full bg-[#1C1E1B] hover:bg-[#252824] active:scale-95 border border-[#A3FF12]/35 flex items-center gap-1.5 text-white transition-all cursor-pointer shadow-[0_0_16px_rgba(163,255,18,0.12)]"
          >
            <Radio className="w-3.5 h-3.5 text-[#A3FF12]" />
            <span className="text-[10.5px] font-mono font-bold tracking-wider text-white">
              SESSION
            </span>
            <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#A3FF12] text-[#0B0D0A] text-[10px] font-mono font-extrabold flex items-center justify-center">
              {connectedSessions.length}
            </span>
          </button>
        </header>

        {/* Main Card (WhatsApp Number + Pairing Code Output) */}
        <section className="bg-[#181A17] border border-white/[0.06] rounded-[22px] p-3 mt-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] shrink-0">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[12.5px] font-medium text-white/90">
              Connexion WhatsApp
            </span>
            <span className="text-[11px] text-[#8E928B] font-mono">
              {selectedCountry.dialCode
                ? `+${getFullPhoneDigits() || selectedCountry.dialCode}`
                : phoneDigits
                ? `+${phoneDigits}`
                : 'Multi-Device'}
            </span>
          </div>

          {/* Box 1: Phone Number Field */}
          <div
            onClick={() => phoneInputRef.current?.focus()}
            className={`bg-[#222421] rounded-[16px] px-3 py-2 flex items-center justify-between gap-2 border transition-all ${
              errorMsg
                ? 'border-red-500/50'
                : 'border-white/[0.03] focus-within:border-[#A3FF12]/40'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] text-[#8C9089] font-medium mb-0.5">
                Numéro WhatsApp
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[17px] font-semibold text-[#A3FF12] tabular-nums shrink-0">
                  +{selectedCountry.dialCode}
                </span>
                <div className="relative flex-1 min-w-0 flex items-center">
                  {phoneDigits ? (
                    <span className="text-[18px] font-semibold text-white tabular-nums tracking-tight truncate">
                      {formatDisplayPhone(phoneDigits)}
                    </span>
                  ) : (
                    <span className="text-[15px] font-medium text-white/25 tabular-nums truncate">
                      {selectedCountry.placeholder}
                    </span>
                  )}
                  <span className="inline-block w-[2px] h-4 bg-[#A3FF12] ml-1 animate-pulse rounded-full shrink-0" />
                </div>
              </div>
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="none"
                value={phoneDigits}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
                  setPhoneDigits(val);
                  setErrorMsg(null);
                }}
                aria-label="Numéro de téléphone WhatsApp"
                className="sr-only"
              />
            </div>

            {/* Country Selector Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCountryOpen(true);
              }}
              className="bg-[#181A17] hover:bg-[#141613] active:scale-95 border border-white/[0.07] rounded-full pl-2.5 pr-2 py-1 flex items-center gap-1 shrink-0 transition-all cursor-pointer"
            >
              <span className="text-[14px] leading-none">{selectedCountry.flag}</span>
              <span className="text-[11px] font-semibold text-white tracking-tight">
                {selectedCountry.code === 'ALL' ? 'Libre' : selectedCountry.code}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>

          {/* Box 2: Pairing Code Output & Direct Generate/Copy Button */}
          <div
            onClick={() => {
              if (pairingCode) {
                copyToClipboard(rawPairingCode || pairingCode, 'code');
              } else if (!isLoading) {
                handleGeneratePairingCode();
              }
            }}
            className={`rounded-[16px] px-3 py-2 mt-1.5 flex items-center justify-between gap-2 border transition-all ${
              pairingCode
                ? 'bg-[#232720] border-[#A3FF12]/35 cursor-pointer hover:border-[#A3FF12]/60'
                : 'bg-[#222421] border-white/[0.05] cursor-pointer hover:border-[#A3FF12]/30'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10.5px] text-[#8C9089] font-medium">
                  Code de connexion (Pairing)
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 py-0.5">
                  <Loader2 className="w-4 h-4 text-[#A3FF12] animate-spin" />
                  <span className="text-[14px] font-mono font-medium text-[#A3FF12]">
                    Génération du code...
                  </span>
                </div>
              ) : pairingCode ? (
                <div className="flex items-center gap-2">
                  <span className="text-[19px] font-mono font-bold tracking-[0.14em] text-[#A3FF12] tabular-nums select-all">
                    {pairingCode}
                  </span>
                </div>
              ) : (
                <div className="text-[17px] font-mono font-semibold tracking-[0.18em] text-white/20 tabular-nums">
                  •••• - ••••
                </div>
              )}
            </div>

            {/* Action Pill Button: Obtenir Code when empty, Copier when code is ready */}
            {pairingCode ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(rawPairingCode || pairingCode, 'code');
                }}
                className={`rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold shrink-0 border transition-all cursor-pointer active:scale-95 ${
                  copiedCode
                    ? 'bg-[#A3FF12] text-[#0B0D0A] border-[#A3FF12] shadow-[0_0_16px_rgba(163,255,18,0.4)]'
                    : 'bg-[#181A17] hover:bg-[#2B2F29] text-white border-[#A3FF12]/40'
                }`}
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#A3FF12]" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGeneratePairingCode();
                }}
                className="rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold shrink-0 bg-[#A3FF12] hover:bg-[#b2ff38] text-[#0B0D0A] border border-[#A3FF12] shadow-[0_0_14px_rgba(163,255,18,0.28)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0D0A]" />
                ) : (
                  <span>Obtenir Code</span>
                )}
              </button>
            )}
          </div>

          {/* Error Feedback or Bot Status Row */}
          <div className="flex items-center justify-between px-1 mt-1.5 pt-0.5 text-[11px]">
            {errorMsg ? (
              <span className="text-red-400 font-medium truncate">{errorMsg}</span>
            ) : (
              <>
                <span className="text-[#8C9089]">Statut du Bot</span>
                <span className="text-white/90 font-medium tabular-nums">
                  {sessionStatus === 'connected'
                    ? 'Connecté à WhatsApp ✓'
                    : pairingCode
                    ? 'Code prêt · Cliquez sur Copier'
                    : 'Prêt · Saisissez votre numéro'}
                </span>
              </>
            )}
          </div>
        </section>

        {/* Secondary Info Card */}
        <section className="bg-[#181A17] border border-white/[0.06] rounded-[18px] px-3.5 py-2 mt-1.5 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[12px] font-semibold text-white">
              {connectedSessions.length > 0
                ? `${connectedSessions.length} Session${connectedSessions.length > 1 ? 's' : ''} Active${connectedSessions.length > 1 ? 's' : ''}`
                : 'Serveur ᴀʟʟɪssᴀ ᴍᴅ'}
            </div>
            <div className="text-[10px] text-[#7E827B] mt-0.5 tabular-nums">
              {sessionStatus === 'code_ready' && countdown > 0
                ? `Expire dans ${formatCountdown(countdown)} · Entrez sur WhatsApp`
                : 'WhatsApp > Appareils connectés'}
            </div>
          </div>

          <div className="text-right">
            {sessionStatus === 'connected' && sessionId ? (
              <button
                type="button"
                onClick={() => copyToClipboard(sessionId, 'session')}
                className="inline-flex items-center gap-1 bg-[#A3FF12]/15 hover:bg-[#A3FF12]/25 border border-[#A3FF12]/40 text-[#A3FF12] px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-semibold transition-all cursor-pointer"
              >
                {copiedSessionId ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>SESSION COPIÉE</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPIER SESSION ID</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <div className="text-[11px] font-medium text-white/90 tabular-nums">
                  1 Numéro = 1 Code MD
                </div>
                <div className="text-[10px] font-semibold text-[#A3FF12] mt-0.5 flex items-center justify-end gap-1">
                  <span>▲</span>
                  <span>En ligne (Baileys v7)</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Tactile Number Keypad */}
        <section
          aria-label="Clavier de saisie numéro WhatsApp"
          className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-1.5 shrink-0"
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-[38px] sm:h-[42px] rounded-full bg-[#222421] hover:bg-[#2B2E2A] active:bg-[#353933] active:scale-[0.96] text-white text-[18px] font-medium flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              {digit}
            </button>
          ))}

          {/* Bottom-left key: Clear ('C') */}
          <button
            type="button"
            onClick={handleClear}
            title="Effacer tout"
            className="h-[38px] sm:h-[42px] rounded-full bg-[#222421] hover:bg-[#2B2E2A] active:bg-[#353933] active:scale-[0.96] text-white/80 hover:text-white text-[14px] font-semibold flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            C
          </button>

          {/* Bottom-center key: '0' */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-[38px] sm:h-[42px] rounded-full bg-[#222421] hover:bg-[#2B2E2A] active:bg-[#353933] active:scale-[0.96] text-white text-[18px] font-medium flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            0
          </button>

          {/* Bottom-right key: Backspace icon */}
          <button
            type="button"
            onClick={handleBackspace}
            title="Effacer un chiffre"
            className="h-[38px] sm:h-[42px] rounded-full bg-[#222421] hover:bg-[#2B2E2A] active:bg-[#353933] active:scale-[0.96] text-white/90 flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <Delete className="w-[17px] h-[17px] stroke-[1.8]" />
          </button>
        </section>

        {/* Bottom Primary Neon Lime CTA Button */}
        <div className="mt-2 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGeneratePairingCode}
            className="w-full h-[46px] sm:h-[48px] rounded-full bg-[#A3FF12] hover:bg-[#b2ff38] active:scale-[0.98] disabled:opacity-60 text-[#0B0D0A] font-bold text-[14px] tracking-tight flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(163,255,18,0.26)] transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B0D0A]" />
                <span>Connexion à WhatsApp...</span>
              </>
            ) : pairingCode ? (
              <>
                <RefreshCw className="w-4 h-4 stroke-[2.2]" />
                <span>Régénérer le Code Pairing</span>
              </>
            ) : (
              <span>Obtenir le Code Pairing</span>
            )}
          </button>
        </div>

        {/* Country Picker Drawer */}
        {isCountryOpen && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-[#181A17] border-t border-white/10 rounded-t-[32px] p-4 max-h-[82%] flex flex-col shadow-2xl">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-white">
                  Choisir l&apos;indicatif pays
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCountryOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#222421] flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Rechercher un pays ou indicatif (+225, +33...)"
                  className="w-full bg-[#222421] border border-white/[0.06] focus:border-[#A3FF12]/50 rounded-xl pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-white/35 outline-none"
                />
              </div>

              <div className="overflow-y-auto custom-scrollbar space-y-1 pr-1 flex-1">
                {filteredCountries.map((country) => {
                  const isSelected = selectedCountry.code === country.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryOpen(false);
                        setCountrySearch('');
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#A3FF12]/15 border border-[#A3FF12]/40 text-white'
                          : 'hover:bg-[#222421] text-white/85'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-[13px] font-medium truncate">
                          {country.name}
                        </span>
                      </div>
                      <span className="text-[12px] font-mono text-[#A3FF12] font-semibold shrink-0 ml-2">
                        {country.dialCode ? `+${country.dialCode}` : 'Complet'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Connected Sessions Drawer (triggered by the top-right SESSION logo button) */}
        {isSessionsOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-[#181A17] border-t border-white/10 rounded-t-[32px] p-4 max-h-[85%] flex flex-col shadow-2xl">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#A3FF12]/15 border border-[#A3FF12]/40 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#A3FF12]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-white leading-tight">
                      Sessions Connectées ({connectedSessions.length})
                    </h2>
                    <p className="text-[11px] text-white/50">
                      ᴀʟʟɪssᴀ ᴍᴅ · Comptes actifs en temps réel
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={fetchSessionsStatus}
                    title="Actualiser la liste"
                    className="w-8 h-8 rounded-full bg-[#222421] hover:bg-[#2B2E2A] flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSessionsOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#222421] hover:bg-[#2B2E2A] flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar space-y-2.5 pr-1 flex-1">
                {connectedSessions.length === 0 ? (
                  <div className="bg-[#222421] border border-white/[0.05] rounded-2xl p-6 text-center my-2">
                    <Smartphone className="w-8 h-8 text-white/30 mx-auto mb-2" />
                    <div className="text-[13.5px] font-semibold text-white mb-1">
                      Aucune session connectée
                    </div>
                    <div className="text-[11.5px] text-white/55">
                      Entrez votre numéro WhatsApp et validez le code Pairing pour apparaître dans la liste des sessions actives.
                    </div>
                  </div>
                ) : (
                  connectedSessions.map((sess, idx) => (
                    <div
                      key={sess.sessionKey || idx}
                      className="bg-[#222421] border border-[#A3FF12]/25 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#181A17] border border-[#A3FF12]/40 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-[#A3FF12]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13.5px] font-mono font-bold text-white truncate">
                                +{sess.phone}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#A3FF12]/15 text-[#A3FF12] text-[9.5px] font-mono font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#A3FF12] animate-pulse" />
                                EN LIGNE
                              </span>
                            </div>
                            <div className="text-[11px] text-white/55 truncate">
                              {sess.userName || 'Utilisateur WhatsApp'} · {sess.commandsCount || 0} cmds
                            </div>
                          </div>
                        </div>

                        {sess.sessionId && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(sess.sessionId!, 'item', sess.sessionKey)
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-[#181A17] hover:bg-[#A3FF12] hover:text-[#0B0D0A] border border-white/10 text-white/85 text-[10.5px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          >
                            {copiedItemKey === sess.sessionKey ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copié</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>ID</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.05] text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-[#181A17] text-white/80">
                          MODE: <strong className="text-[#A3FF12] uppercase">{sess.botMode}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#181A17] text-white/80">
                          STATUT AUTO:{' '}
                          <strong className="text-[#A3FF12]">
                            {sess.autoStatusView
                              ? `ON ${sess.autoStatusReactEmoji || '❤️'}`
                              : 'OFF'}
                          </strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#181A17] text-white/80">
                          WOWONLY:{' '}
                          <strong className="text-[#A3FF12]">
                            {sess.alwaysOnline ? 'ON' : 'OFF'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
