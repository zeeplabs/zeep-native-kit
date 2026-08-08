import { type CSSProperties, useEffect, useState } from 'react';
import {
  ZeepProvider,
  useZeep,
  AnimatedBackground,
  GlassCard,
  ShimmerText,
  Button,
  StatusDot,
  ToastProvider,
  useToast,
  Skeleton,
  SkeletonText,
  MarkdownRenderer,
  SearchHighlight,
} from '@zeeptech/ui';
import type { AccentTheme, Theme } from '@zeeptech/ui';
import { prefsGet, prefsSet, keychainGet, keychainSet, shellWhich } from '@zeeptech/core';
import { LogViewer, LogLevelSelector, useLogEvents } from '@zeeptech/logger';
import { useUpdater, UpdateBanner, UpdateProgress, UpdateReadyDialog } from '@zeeptech/updater';
import { useAI, AIProviderStatus, AIPromptInput, AIResponseStream, AIProviderPicker, stripFences } from '@zeeptech/ai';

const ACCENT_THEMES: AccentTheme[] = ['violet', 'ocean', 'sunset', 'forest', 'graphite'];
const THEMES: Theme[] = ['light', 'dark', 'system'];

const SAMPLE_MD = `## Hello from MarkdownRenderer

This component uses **marked** for parsing and **DOMPurify** for sanitization.

### Code example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const msg = greet('Zeep');
console.log(msg);
\`\`\`

### Features

- Syntax highlight via **highlight.js** (lazy-loaded)
- XSS-safe: \`<script>alert(1)</script>\` is stripped
- zeep token styles: headings, links, blockquotes

> Built for Tauri desktop apps with the Zeep design system.
`;

const page: CSSProperties = {
  background: 'var(--zeep-bg)',
  color: 'var(--zeep-text)',
  minHeight: '100vh',
  padding: '2rem',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const section: CSSProperties = {
  marginBottom: '3rem',
};

const sectionTitle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--zeep-accent)',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--zeep-border)',
};

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
};

const chipBase: CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: 'var(--zeep-radius-full)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--zeep-border)',
  background: 'var(--zeep-surface)',
  color: 'var(--zeep-text)',
  transition: 'all 0.15s ease',
};

function chipActive(active: boolean): CSSProperties {
  return active
    ? { ...chipBase, background: 'var(--zeep-accent)', color: '#fff', borderColor: 'var(--zeep-accent)' }
    : chipBase;
}

function GalleryContent() {
  const { theme: resolvedTheme, accentTheme, setTheme, setAccentTheme } = useZeep();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('Zeep');
  const [prefsValue, setPrefsValue] = useState('');
  const [prefsResult, setPrefsResult] = useState<string | null>(null);
  const [keychainValue, setKeychainValue] = useState('');
  const [keychainResult, setKeychainResult] = useState<string | null>(null);
  const [shellResult, setShellResult] = useState<string | null>(null);
  const logEvents = useLogEvents({ maxEntries: 200 });
  const updater = useUpdater();
  const [showLogger, setShowLogger] = useState(false);
  const [showUpdater, setShowUpdater] = useState(false);
  const ai = useAI();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [aiVisible, setAiVisible] = useState(false);

  useEffect(() => { console.log('zeep-ui Gallery mounted'); }, []);

  async function handlePrefsSet() {
    try {
      await prefsSet('native-kit-demo', prefsValue);
      setPrefsResult(`set ok: "${prefsValue}"`);
    } catch (err) {
      setPrefsResult(`error: ${String(err)}`);
    }
  }

  async function handlePrefsGet() {
    try {
      const value = await prefsGet('native-kit-demo');
      setPrefsResult(`get: ${JSON.stringify(value)}`);
    } catch (err) {
      setPrefsResult(`error: ${String(err)}`);
    }
  }

  async function handleKeychainSet() {
    try {
      await keychainSet('native-kit-demo', keychainValue);
      setKeychainResult(`set ok: "${keychainValue}"`);
    } catch (err) {
      setKeychainResult(`error: ${String(err)}`);
    }
  }

  async function handleKeychainGet() {
    try {
      const value = await keychainGet('native-kit-demo');
      setKeychainResult(`get: ${JSON.stringify(value)}`);
    } catch (err) {
      setKeychainResult(`error: ${String(err)}`);
    }
  }

  async function handleShellWhich() {
    try {
      const path = await shellWhich('node');
      setShellResult(`node: ${JSON.stringify(path)}`);
    } catch (err) {
      setShellResult(`error: ${String(err)}`);
    }
  }

  return (
    <div style={page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <ShimmerText as="h1" size="3xl" style={{ marginBottom: '0.25rem' }}>
          zeep-ui Gallery
        </ShimmerText>
        <p style={{ color: 'var(--zeep-text-muted)', marginBottom: '3rem', fontSize: 'var(--zeep-font-sm)' }}>
          M2 components — ZT-13..ZT-21
        </p>

        {/* ── Tokens & Temas ── */}
        <div style={section}>
          <div style={sectionTitle}>Tokens &amp; Temas</div>
          <div style={{ ...row, marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>Theme:</span>
            {THEMES.map(t => (
              <button
                key={t}
                style={chipActive(resolvedTheme === t || (t === 'system' && !['light','dark'].includes(resolvedTheme)))}
                onClick={() => { setTheme(t); }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={row}>
            <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>Accent:</span>
            {ACCENT_THEMES.map(a => (
              <button
                key={a}
                style={chipActive(accentTheme === a)}
                onClick={() => { setAccentTheme(a); }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* ── AnimatedBackground ── */}
        <div style={section}>
          <div style={sectionTitle}>AnimatedBackground</div>
          <div style={row}>
            {(['subtle', 'medium', 'strong'] as const).map(intensity => (
              <div
                key={intensity}
                style={{ position: 'relative', width: 200, height: 100, borderRadius: 'var(--zeep-radius-lg)', overflow: 'hidden', border: '1px solid var(--zeep-border)' }}
              >
                <AnimatedBackground intensity={intensity} />
                <div style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem', textAlign: 'center', fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text)' }}>
                  {intensity}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GlassCard ── */}
        <div style={section}>
          <div style={sectionTitle}>GlassCard</div>
          <div style={{ position: 'relative', padding: '2rem', borderRadius: 'var(--zeep-radius-lg)', overflow: 'hidden', background: 'linear-gradient(135deg, var(--zeep-accent-dark), var(--zeep-bg))' }}>
            <AnimatedBackground intensity="medium" />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(['sm', 'md', 'lg'] as const).map(r => (
                <GlassCard key={r} radius={r} padding="md" style={{ flex: '1 1 180px' }}>
                  <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>radius={r}</div>
                  <div style={{ color: 'var(--zeep-text)', fontWeight: 600 }}>GlassCard</div>
                  <div style={{ color: 'var(--zeep-text-muted)', fontSize: 'var(--zeep-font-xs)' }}>Hover me for parallax</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>

        {/* ── ShimmerText ── */}
        <div style={section}>
          <div style={sectionTitle}>ShimmerText</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <ShimmerText as="h1" size="3xl">Heading 1 · 3xl</ShimmerText>
            <ShimmerText as="h2" size="2xl">Heading 2 · 2xl</ShimmerText>
            <ShimmerText as="span" size="lg" weight={400}>Span · lg · regular</ShimmerText>
          </div>
        </div>

        {/* ── Button ── */}
        <div style={section}>
          <div style={sectionTitle}>Button</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['primary', 'secondary', 'ghost', 'danger'] as const).map(variant => (
              <div key={variant} style={row}>
                <span style={{ width: 80, fontSize: 'var(--zeep-font-xs)', color: 'var(--zeep-text-muted)' }}>{variant}</span>
                {(['sm', 'md', 'lg'] as const).map(size => (
                  <Button key={size} variant={variant} size={size}>{variant} {size}</Button>
                ))}
                <Button variant={variant} size="md" isLoading>loading</Button>
                <Button variant={variant} size="md" disabled>disabled</Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── StatusDot ── */}
        <div style={section}>
          <div style={sectionTitle}>StatusDot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['online', 'offline', 'busy', 'away'] as const).map(status => (
              <div key={status} style={row}>
                <StatusDot status={status} size={10} />
                <StatusDot status={status} size={10} pulse />
                <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>
                  {status} / {status} pulse
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toast ── */}
        <div style={section}>
          <div style={sectionTitle}>Toast</div>
          <div style={row}>
            <Button variant="secondary" size="sm" onClick={() => { toast.success('Operação concluída!'); }}>success</Button>
            <Button variant="secondary" size="sm" onClick={() => { toast.error('Algo deu errado', { duration: 5000 }); }}>error (5s)</Button>
            <Button variant="secondary" size="sm" onClick={() => { toast.info('Informação importante.'); }}>info</Button>
            <Button variant="secondary" size="sm" onClick={() => { toast.warning('Atenção: verifique os dados.'); }}>warning</Button>
          </div>
        </div>

        {/* ── Skeleton ── */}
        <div style={section}>
          <div style={sectionTitle}>Skeleton</div>
          <div style={{ ...row, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton width="100%" height={120} radius="md" />
              <Skeleton width="60%" height={16} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <SkeletonText lines={4} lineHeight={14} gap={10} />
            </div>
          </div>
        </div>

        {/* ── SearchHighlight ── */}
        <div style={section}>
          <div style={sectionTitle}>SearchHighlight</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); }}
              placeholder="Search query..."
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--zeep-radius-md)',
                border: '1px solid var(--zeep-border)',
                background: 'var(--zeep-surface)',
                color: 'var(--zeep-text)',
                fontSize: 'var(--zeep-font-sm)',
                outline: 'none',
              }}
            />
          </div>
          <p style={{ fontSize: 'var(--zeep-font-md)', lineHeight: 1.8 }}>
            <SearchHighlight
              text="The Zeep design system is built for Tauri desktop apps. Zeep components use CSS custom properties for theming."
              query={searchQuery}
            />
          </p>
        </div>

        {/* ── MarkdownRenderer ── */}
        <div style={section}>
          <div style={sectionTitle}>MarkdownRenderer</div>
          <GlassCard padding="lg" radius="lg">
            <MarkdownRenderer content={SAMPLE_MD} searchQuery={searchQuery || undefined} />
          </GlassCard>
        </div>

        {/* ── AI Integration (M4) ── */}
        <div style={section}>
          <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>AI</span>
            <span style={{ fontSize: 'var(--zeep-font-xs)', color: 'var(--zeep-text-muted)' }}>M4</span>
            <span
              style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--zeep-accent)' }}
              onClick={() => { setAiVisible(s => !s); }}
            >
              {aiVisible ? 'hide' : 'show'}
            </span>
          </div>
          {aiVisible && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button variant="secondary" size="sm" onClick={async () => { await ai.detect(); }}>
                {ai.status === 'detecting' ? 'Detecting…' : 'Detect AI CLIs'}
              </Button>
              {ai.providers.length > 0 && (
                <>
                  <AIProviderStatus providers={ai.providers} />
                  <AIProviderPicker
                    providers={ai.providers}
                    value={selectedProvider}
                    onChange={setSelectedProvider}
                  />
                  <AIPromptInput
                    onSend={async (prompt) => {
                      if (selectedProvider) await ai.run(selectedProvider, prompt);
                    }}
                    disabled={!selectedProvider || ai.status === 'running'}
                  />
                  {(ai.output || ai.status === 'running') && (
                    <AIResponseStream text={stripFences(ai.output)} isStreaming={ai.status === 'running'} />
                  )}
                  {ai.status === 'running' && (
                    <Button variant="secondary" size="sm" onClick={ai.cancel}>Cancel</Button>
                  )}
                  {ai.error && (
                    <div style={{ fontSize: 'var(--zeep-font-sm)', color: '#ef4444' }}>Error: {ai.error}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Logger (M3) ── */}
        <div style={section}>
          <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Logger</span>
            <span style={{ fontSize: 'var(--zeep-font-xs)', color: 'var(--zeep-text-muted)' }}>M3</span>
            <span
              style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--zeep-accent)' }}
              onClick={() => { setShowLogger(s => !s); }}
            >
              {showLogger ? 'hide' : 'show'}
            </span>
          </div>
          {showLogger && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <LogLevelSelector initialLevel="Debug" />
              <LogViewer logEvents={logEvents} maxHeight={300} />
            </div>
          )}
        </div>

        {/* ── Updater (M3) ── */}
        <div style={section}>
          <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Updater</span>
            <span style={{ fontSize: 'var(--zeep-font-xs)', color: 'var(--zeep-text-muted)' }}>M3</span>
            <span
              style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--zeep-accent)' }}
              onClick={() => { setShowUpdater(s => !s); }}
            >
              {showUpdater ? 'hide' : 'show'}
            </span>
          </div>
          {showUpdater && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {updater.state.status === 'available' && !updater.state.dismissed && (
                <UpdateBanner
                  version={updater.state.updateInfo!.version}
                  notes={updater.state.updateInfo!.body}
                  onInstall={() => { updater.install(); }}
                  onDismiss={() => { updater.dismiss(); }}
                />
              )}
              {updater.state.status === 'downloading' && (
                <UpdateProgress
                  downloaded={updater.state.downloaded}
                  contentLength={updater.state.contentLength}
                />
              )}
              {updater.state.status === 'ready' && (
                <UpdateReadyDialog
                  onRestart={() => { updater.restart(); }}
                  onDismiss={() => { updater.dismiss(); }}
                />
              )}
              {updater.state.status === 'error' && (
                <div style={{ fontSize: 'var(--zeep-font-sm)', color: '#ef4444' }}>
                  Error: {updater.state.error}
                </div>
              )}
              <div style={row}>
                <Button variant="secondary" size="sm" onClick={async () => { await updater.check(); }}>
                  {updater.state.status === 'checking' ? 'Checking…' : 'Check for Updates'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Native Kit (M1) ── */}
        <div style={section}>
          <div style={sectionTitle}>Native Kit</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
                Prefs
              </div>
              <div style={row}>
                <input
                  type="text"
                  value={prefsValue}
                  onChange={e => { setPrefsValue(e.target.value); }}
                  placeholder="value to store"
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--zeep-radius-md)',
                    border: '1px solid var(--zeep-border)',
                    background: 'var(--zeep-surface)',
                    color: 'var(--zeep-text)',
                    fontSize: 'var(--zeep-font-sm)',
                    outline: 'none',
                  }}
                />
                <Button variant="secondary" size="sm" onClick={handlePrefsSet}>set</Button>
                <Button variant="secondary" size="sm" onClick={handlePrefsGet}>get</Button>
                {prefsResult !== null && (
                  <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{prefsResult}</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
                Keychain
              </div>
              <div style={row}>
                <input
                  type="text"
                  value={keychainValue}
                  onChange={e => { setKeychainValue(e.target.value); }}
                  placeholder="secret to store"
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--zeep-radius-md)',
                    border: '1px solid var(--zeep-border)',
                    background: 'var(--zeep-surface)',
                    color: 'var(--zeep-text)',
                    fontSize: 'var(--zeep-font-sm)',
                    outline: 'none',
                  }}
                />
                <Button variant="secondary" size="sm" onClick={handleKeychainSet}>set</Button>
                <Button variant="secondary" size="sm" onClick={handleKeychainGet}>get</Button>
                {keychainResult !== null && (
                  <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{keychainResult}</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
                Shell
              </div>
              <div style={row}>
                <Button variant="secondary" size="sm" onClick={handleShellWhich}>which node</Button>
                {shellResult !== null && (
                  <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{shellResult}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UIGallery() {
  return (
    <ZeepProvider>
      <ToastProvider>
        <GalleryContent />
      </ToastProvider>
    </ZeepProvider>
  );
}
