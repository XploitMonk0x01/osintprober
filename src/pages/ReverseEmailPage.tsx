import React, { useState } from 'react';
import { ArrowRight, ChevronRight, Mail } from 'lucide-react';

interface ReverseEmailPageProps {
  onSearchEmail: (email: string) => void;
}

const FEATURES = [
  {
    index: '01',
    title: 'Mail exchange routing',
    body: 'Reads the domain’s DNS MX records and names the mail host behind the address — Google, Microsoft, Proton, Zoho or a custom exchange.',
  },
  {
    index: '02',
    title: 'Gravatar hash match',
    body: 'Hashes the address the way Gravatar does and reads the public profile attached to that hash, if one exists.',
  },
  {
    index: '03',
    title: 'Public account matches',
    body: 'Searches sources that expose a public email field, such as GitHub, and links only the accounts a source actually returns.',
  },
];

const FAQ = [
  {
    q: 'What does this lookup actually check?',
    a: 'DNS mail exchanger records, the Gravatar hash for the address, and sources with a public email search. Every result carries the evidence of the check that produced it.',
  },
  {
    q: 'Why are some sources marked unverified?',
    a: 'Most providers do not expose account existence publicly and block automated checks. Those sources are reported as unverified instead of guessed at, so nothing on the page is invented.',
  },
  {
    q: 'Are breach records included?',
    a: 'No. Breach data comes from a licensed provider that is not configured in this build, so no breach records are shown.',
  },
];

export const ReverseEmailPage: React.FC<ReverseEmailPageProps> = ({ onSearchEmail }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onSearchEmail(email.trim());
    }
  };

  return (
    <div className="pb-8">
      <section className="border-b border-white/[0.07] pb-14 pt-16 sm:pb-16 sm:pt-20">
        <span className="label">Reverse email</span>

        <h1 className="mt-4 max-w-2xl text-balance text-[2.1rem] font-medium leading-[1.06] tracking-[-0.045em] text-paper sm:text-[3rem]">
          An address is a thread. Follow it.
        </h1>

        <p className="mt-4 max-w-lg text-pretty text-[12.5px] leading-relaxed text-dim sm:text-[13px]">
          Resolve the mail host behind an address, match its Gravatar hash, and surface the
          public accounts that expose it.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0a0c0e]/90 p-1.5 pl-3.5 backdrop-blur-sm transition-all duration-200 focus-within:border-accent/40 focus-within:shadow-[0_0_0_3px_rgba(143,184,255,0.06)]">
            <Mail className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.6} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              aria-label="Email address"
              required
              className="h-9 min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-paper placeholder:font-sans placeholder:text-faint focus:outline-none"
            />
            <button type="submit" className="btn btn-primary h-9 shrink-0 pl-3 pr-2.5">
              Scan
              <ArrowRight className="h-3 w-3 opacity-40" />
            </button>
          </div>

          <p className="mt-2.5 font-mono text-[10px] text-faint">
            DNS MX · Gravatar hash · public email search
          </p>
        </form>
      </section>

      {/* Capability columns */}
      <section className="grid gap-px border-x border-b border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.index} className="bg-[#08090b] px-5 py-6">
            <span className="label font-mono text-[9.5px]">{f.index}</span>
            <h2 className="mt-5 text-[12.5px] font-medium tracking-[-0.01em] text-paper">
              {f.title}
            </h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{f.body}</p>
          </div>
        ))}
      </section>

      <p className="mt-5 max-w-2xl text-[11px] leading-relaxed text-faint">
        Only sources with a public, verifiable check are reported. Providers that require an
        authenticated API appear as unverified rather than being guessed at.
      </p>

      {/* FAQ */}
      <section className="mt-16 max-w-2xl">
        <h2 className="label">Questions</h2>

        <div className="mt-3 divide-y divide-white/[0.07] border-t border-white/[0.07]">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-[12px] text-paper transition-colors duration-200 group-hover:text-white">
                  {item.q}
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-300 group-open:rotate-90"
                  strokeWidth={1.6}
                />
              </summary>
              <p className="mt-3 max-w-xl text-[11.5px] leading-relaxed text-dim">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};
