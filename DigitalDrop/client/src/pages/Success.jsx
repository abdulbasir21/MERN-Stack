import { useSearchParams, Link } from 'react-router-dom';

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile">
      <div className="glass-panel inner-glow rounded-2xl p-12 max-w-md w-full text-center">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6 pulse-teal animate-scale-in">
          <svg
            className="w-10 h-10 checkmark-anim"
            viewBox="0 0 52 52"
            fill="none"
            stroke="#41eec2"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="14 27 22 35 38 19" />
          </svg>
        </div>

        <h1 className="text-headline-md text-on-surface mb-2">Payment Successful!</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Your download link has been sent to your email. Check your inbox — it may take a
          minute to arrive.
        </p>

        {sessionId && (
          <p className="text-label-sm font-mono text-outline-variant mb-6 break-all">
            Ref: {sessionId}
          </p>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-mono text-label-md px-6 py-3 rounded-lg hover:bg-primary-fixed-dim active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          Back to Marketplace
        </Link>

        <p className="mt-6 text-label-sm font-mono text-outline-variant">
          Download links expire after 48 hours.
        </p>
      </div>
    </div>
  );
}
